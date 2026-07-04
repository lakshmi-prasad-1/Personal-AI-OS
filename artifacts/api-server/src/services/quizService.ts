import { and, desc, eq } from "drizzle-orm";
import OpenAI from "openai";
import { db, quizzesTable, quizAttemptsTable, type InsertQuiz, type Quiz, type QuizAttempt } from "@workspace/db";
import { logger } from "../lib/logger";

const openaiApiKey = process.env["OPENAI_API_KEY"];
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export interface QuizQuestion {
  id: string;
  type: "mcq" | "true_false" | "fill_blank" | "short_answer" | "long_answer" | "coding" | "scenario";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  hint?: string;
}

export const quizService = {
  async list(userId: string, filters?: { subjectId?: string; topicId?: string }): Promise<Quiz[]> {
    const conditions = [eq(quizzesTable.userId, userId)];
    if (filters?.subjectId) conditions.push(eq(quizzesTable.subjectId, filters.subjectId));
    if (filters?.topicId) conditions.push(eq(quizzesTable.topicId, filters.topicId));
    return db.select().from(quizzesTable).where(and(...conditions)).orderBy(desc(quizzesTable.createdAt));
  },

  async get(userId: string, id: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzesTable).where(and(eq(quizzesTable.id, id), eq(quizzesTable.userId, userId)));
    return quiz;
  },

  async create(userId: string, data: Omit<InsertQuiz, "userId">): Promise<Quiz> {
    const [quiz] = await db.insert(quizzesTable).values({ ...data, userId }).returning();
    if (!quiz) throw new Error("Failed to create quiz");
    return quiz;
  },

  async remove(userId: string, id: string): Promise<Quiz | undefined> {
    const [quiz] = await db.delete(quizzesTable).where(and(eq(quizzesTable.id, id), eq(quizzesTable.userId, userId))).returning();
    return quiz;
  },

  async listAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
    return db.select().from(quizAttemptsTable).where(and(eq(quizAttemptsTable.userId, userId), eq(quizAttemptsTable.quizId, quizId))).orderBy(desc(quizAttemptsTable.completedAt));
  },

  async submitAttempt(userId: string, quizId: string, answers: { questionId: string; answer: string }[], timeSpentSeconds?: number): Promise<QuizAttempt | undefined> {
    const quiz = await this.get(userId, quizId);
    if (!quiz) return undefined;
    const questions = (quiz.questions as unknown as QuizQuestion[]) ?? [];
    let correctCount = 0;
    for (const q of questions) {
      const given = answers.find((a) => a.questionId === q.id)?.answer?.trim().toLowerCase();
      if (given && given === q.correctAnswer.trim().toLowerCase()) correctCount++;
    }
    const totalQuestions = questions.length;
    const score = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const [attempt] = await db
      .insert(quizAttemptsTable)
      .values({ userId, quizId, answers, score, totalQuestions, correctCount, timeSpentSeconds })
      .returning();
    if (!attempt) throw new Error("Failed to save quiz attempt");
    return attempt;
  },

  async stats(userId: string) {
    const attempts = await db.select().from(quizAttemptsTable).where(eq(quizAttemptsTable.userId, userId)).orderBy(desc(quizAttemptsTable.completedAt));
    const avgScore = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;
    return { totalAttempts: attempts.length, avgScore, recent: attempts.slice(0, 5) };
  },

  /** AI generation: produces quiz questions. Degrades gracefully without an API key. */
  async generateWithAi(params: { topic: string; sourceText?: string; count?: number; difficulty?: string; types?: string[] }): Promise<QuizQuestion[]> {
    const { topic, sourceText, count = 5, difficulty = "medium", types = ["mcq"] } = params;
    if (!openai) {
      return [{ id: "q1", type: "mcq", question: `AI quiz generation requires OPENAI_API_KEY. Placeholder question about ${topic}?`, options: ["A", "B", "C", "D"], correctAnswer: "A", difficulty: "medium" }];
    }
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are an expert exam question writer. Respond ONLY with JSON: { "questions": [{ "type": "mcq"|"true_false"|"fill_blank"|"short_answer"|"long_answer"|"coding"|"scenario", "question": string, "options": string[] (only for mcq/true_false), "correctAnswer": string, "explanation": string, "difficulty": "easy"|"medium"|"hard", "hint": string }] }',
          },
          {
            role: "user",
            content: `Generate ${count} ${difficulty}-difficulty quiz questions (types: ${types.join(", ")}) about: "${topic}".${sourceText ? ` Base them on this material: ${sourceText.slice(0, 3000)}` : ""}`,
          },
        ],
      });
      const raw = completion.choices[0]?.message.content ?? "{}";
      const parsed = JSON.parse(raw) as { questions?: Omit<QuizQuestion, "id">[] };
      return (parsed.questions ?? []).map((q, i) => ({ id: `q${i + 1}`, ...q }));
    } catch (err) {
      logger.error({ err }, "AI quiz generation failed");
      return [];
    }
  },
};
