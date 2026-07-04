import { eq } from "drizzle-orm";
import { db, aiSettingsTable, type InsertAiSettings, type AiSettings } from "@workspace/db";

/**
 * Phase 4, Module 22: AI Settings. Tunables that shape how proactive the AI
 * is (planning aggressiveness, recommendation frequency, personality) and
 * which subsystems are active (study/career/focus/voice mode). Read by the
 * Decision/Life Decision Engines and planners — this file only persists them.
 */
export const aiSettingsService = {
  async getOrCreate(userId: string): Promise<AiSettings> {
    const [existing] = await db.select().from(aiSettingsTable).where(eq(aiSettingsTable.userId, userId));
    if (existing) return existing;
    const [created] = await db.insert(aiSettingsTable).values({ userId }).returning();
    if (!created) throw new Error("Failed to create AI settings");
    return created;
  },

  async upsert(userId: string, data: Partial<Omit<InsertAiSettings, "userId">>): Promise<AiSettings> {
    await this.getOrCreate(userId);
    const [updated] = await db.update(aiSettingsTable).set(data).where(eq(aiSettingsTable.userId, userId)).returning();
    if (!updated) throw new Error("Failed to update AI settings");
    return updated;
  },
};
