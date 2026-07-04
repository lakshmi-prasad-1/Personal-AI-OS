import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import OpenAI from "openai";
import {
  db,
  flashcardsTable,
  flashcardReviewsTable,
  type InsertFlashcard,
  type Flashcard,
  type FlashcardReview,
} from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";
import { logger } from "../lib/logger";

const openaiApiKey = process.env["OPENAI_API_KEY"];
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// SM-2 style spaced repetition mapped to a simple 4-point rating scale.
const RATING_QUALITY: Record<string, number> = { again: 0, hard: 3, good: 4, easy: 5 };

export const flashcardService = {
  async list(userId: string, filters?: { subjectId?: string; topicId?: string }): Promise<Flashcard[]> {
    const conditions = [eq(flashcardsTable.userId, userId)];
    if (filters?.subjectId) conditions.push(eq(flashcardsTable.subjectId, filters.subjectId));
    if (filters?.topicId) conditions.push(eq(flashcardsTable.topicId, filters.topicId));
    return db.select().from(flashcardsTable).where(and(...conditions)).orderBy(desc(flashcardsTable.createdAt));
  },

  async get(userId: string, id: string): Promise<Flashcard | undefined> {
    const [card] = await db.select().from(flashcardsTable).where(and(eq(flashcardsTable.id, id), eq(flashcardsTable.userId, userId)));
    return card;
  },

  async create(userId: string, data: Omit<InsertFlashcard, "userId">): Promise<Flashcard> {
    const [card] = await db.insert(flashcardsTable).values({ ...data, userId, nextReviewDate: new Date().toISOString().slice(0, 10) }).returning();
    if (!card) throw new Error("Failed to create flashcard");
    await knowledgeGraphService.autoLink({ userId, entityType: "flashcard", entityId: card.id, label: card.front, text: `${card.front} ${card.back}` });
    return card;
  },

  async createMany(userId: string, cards: Omit<InsertFlashcard, "userId">[]): Promise<Flashcard[]> {
    const created: Flashcard[] = [];
    for (const c of cards) created.push(await this.create(userId, c));
    return created;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertFlashcard, "userId">>): Promise<Flashcard | undefined> {
    const [card] = await db.update(flashcardsTable).set(data).where(and(eq(flashcardsTable.id, id), eq(flashcardsTable.userId, userId))).returning();
    return card;
  },

  async remove(userId: string, id: string): Promise<Flashcard | undefined> {
    const [card] = await db.delete(flashcardsTable).where(and(eq(flashcardsTable.id, id), eq(flashcardsTable.userId, userId))).returning();
    return card;
  },

  async due(userId: string, limit = 20): Promise<Flashcard[]> {
    const today = new Date().toISOString().slice(0, 10);
    const cards = await db
      .select()
      .from(flashcardsTable)
      .where(and(eq(flashcardsTable.userId, userId), or(isNull(flashcardsTable.nextReviewDate), lte(flashcardsTable.nextReviewDate, today))))
      .orderBy(asc(flashcardsTable.nextReviewDate));
    return cards.slice(0, limit);
  },

  /** Apply an SM-2-lite spaced repetition update after a review rating. */
  async review(userId: string, id: string, rating: "again" | "hard" | "good" | "easy"): Promise<{ card: Flashcard; review: FlashcardReview } | undefined> {
    const card = await this.get(userId, id);
    if (!card) return undefined;

    const quality = RATING_QUALITY[rating] ?? 3;
    let easeFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easeFactor = Math.max(1.3, easeFactor);

    let intervalDays: number;
    if (quality < 3) {
      intervalDays = 1; // failed -> reset, review again tomorrow
    } else if (card.reviewCount === 0) {
      intervalDays = 1;
    } else if (card.reviewCount === 1) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(card.intervalDays * easeFactor) || 1;
    }

    const masteryDelta = quality < 3 ? -15 : quality === 3 ? 5 : quality === 4 ? 12 : 20;
    const masteryScore = Math.max(0, Math.min(100, card.masteryScore + masteryDelta));

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

    const [updated] = await db
      .update(flashcardsTable)
      .set({
        easeFactor,
        intervalDays,
        masteryScore,
        reviewCount: card.reviewCount + 1,
        nextReviewDate: nextReviewDate.toISOString().slice(0, 10),
        lastReviewedAt: new Date(),
      })
      .where(and(eq(flashcardsTable.id, id), eq(flashcardsTable.userId, userId)))
      .returning();
    if (!updated) return undefined;

    const [review] = await db.insert(flashcardReviewsTable).values({ userId, flashcardId: id, rating }).returning();
    if (!review) throw new Error("Failed to log flashcard review");

    return { card: updated, review };
  },

  async stats(userId: string) {
    const cards = await this.list(userId);
    const due = await this.due(userId, 1000);
    const avgMastery = cards.length ? Math.round(cards.reduce((s, c) => s + c.masteryScore, 0) / cards.length) : 0;
    return {
      total: cards.length,
      dueToday: due.length,
      avgMastery,
      mastered: cards.filter((c) => c.masteryScore >= 80).length,
      weak: cards.filter((c) => c.masteryScore < 40).length,
    };
  },

  /**
   * AI generation: produces flashcards from a topic/subject name and optional
   * source text (e.g. resource summary). Degrades gracefully without an API key.
   */
  async generateWithAi(params: { topic: string; sourceText?: string; count?: number; type?: string }): Promise<{ front: string; back: string; type: string; difficulty: string }[]> {
    const { topic, sourceText, count = 5, type = "concept" } = params;
    if (!openai) {
      return [{ front: `What is ${topic}?`, back: "AI flashcard generation requires OPENAI_API_KEY to be configured.", type, difficulty: "medium" }];
    }
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are an expert study assistant that generates high-quality flashcards for spaced-repetition learning. Respond ONLY with JSON: { \"cards\": [{ \"front\": string, \"back\": string, \"type\": \"definition\"|\"concept\"|\"formula\"|\"programming\"|\"revision\", \"difficulty\": \"easy\"|\"medium\"|\"hard\" }] }",
          },
          {
            role: "user",
            content: `Generate ${count} flashcards (type preference: ${type}) about: "${topic}".${sourceText ? ` Base them on this material: ${sourceText.slice(0, 3000)}` : ""} Keep fronts short (a question or term) and backs concise but complete.`,
          },
        ],
      });
      const raw = completion.choices[0]?.message.content ?? "{}";
      const parsed = JSON.parse(raw) as { cards?: { front: string; back: string; type?: string; difficulty?: string }[] };
      return (parsed.cards ?? []).map((c) => ({ front: c.front, back: c.back, type: c.type ?? type, difficulty: c.difficulty ?? "medium" }));
    } catch (err) {
      logger.error({ err }, "AI flashcard generation failed");
      return [];
    }
  },
};
