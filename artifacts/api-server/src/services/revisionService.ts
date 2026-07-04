import { and, desc, eq } from "drizzle-orm";
import {
  db,
  revisionSessionsTable,
  weakTopicsTable,
  type InsertRevisionSession,
  type RevisionSession,
  type WeakTopic,
} from "@workspace/db";
import { flashcardService } from "./flashcardService";
import { subjectService } from "./subjectService";

export const revisionService = {
  async list(userId: string): Promise<RevisionSession[]> {
    return db.select().from(revisionSessionsTable).where(eq(revisionSessionsTable.userId, userId)).orderBy(desc(revisionSessionsTable.completedAt));
  },

  async logSession(userId: string, data: Omit<InsertRevisionSession, "userId">): Promise<RevisionSession> {
    const [session] = await db.insert(revisionSessionsTable).values({ ...data, userId }).returning();
    if (!session) throw new Error("Failed to log revision session");
    return session;
  },

  // ─── Weak topics ────────────────────────────────────────────────────────
  async listWeakTopics(userId: string): Promise<WeakTopic[]> {
    return db.select().from(weakTopicsTable).where(and(eq(weakTopicsTable.userId, userId), eq(weakTopicsTable.status, "active"))).orderBy(desc(weakTopicsTable.weaknessScore));
  },

  async flagWeakTopic(userId: string, data: { subjectId?: string; topicId?: string; reason: string; weaknessScore: number }): Promise<WeakTopic> {
    const [flagged] = await db.insert(weakTopicsTable).values({ userId, ...data, status: "active" }).returning();
    if (!flagged) throw new Error("Failed to flag weak topic");
    return flagged;
  },

  async resolveWeakTopic(userId: string, id: string): Promise<WeakTopic | undefined> {
    const [resolved] = await db.update(weakTopicsTable).set({ status: "resolved" }).where(and(eq(weakTopicsTable.id, id), eq(weakTopicsTable.userId, userId))).returning();
    return resolved;
  },

  /**
   * "What should I revise today?" — combines flashcards due for spaced
   * repetition with actively flagged weak topics into one recommendation.
   */
  async recommendToday(userId: string) {
    const [dueCards, weakTopics] = await Promise.all([
      flashcardService.due(userId, 10),
      this.listWeakTopics(userId),
    ]);
    const topics = await subjectService.listTopics(userId);
    const revisionNeeded = topics.filter((t) => t.status === "revision_needed");

    return {
      dueFlashcards: dueCards,
      weakTopics: weakTopics.slice(0, 5),
      topicsFlaggedForRevision: revisionNeeded.slice(0, 5),
      totalItems: dueCards.length + weakTopics.length + revisionNeeded.length,
    };
  },
};
