import { eq } from "drizzle-orm";
import { db, lifeProfilesTable, type InsertLifeProfile, type LifeProfile } from "@workspace/db";

/**
 * Phase 4, Module 1: Life Profile. One row per user, continuously refined by
 * the AI as it learns wake/sleep times, work/study hours, energy patterns,
 * priorities, and life vision. Read by contextEngine, the daily/weekly/
 * monthly planners, and the Life Decision Engine.
 */
export const lifeProfileService = {
  async getOrCreate(userId: string): Promise<LifeProfile> {
    const [existing] = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId));
    if (existing) return existing;
    const [created] = await db.insert(lifeProfilesTable).values({ userId }).returning();
    if (!created) throw new Error("Failed to create life profile");
    return created;
  },

  async upsert(userId: string, data: Partial<Omit<InsertLifeProfile, "userId">>): Promise<LifeProfile> {
    await this.getOrCreate(userId);
    const [updated] = await db.update(lifeProfilesTable).set(data).where(eq(lifeProfilesTable.userId, userId)).returning();
    if (!updated) throw new Error("Failed to update life profile");
    return updated;
  },

  /** Whether enough of the profile is filled in to be useful for planning. */
  isPopulated(profile: LifeProfile): boolean {
    return Boolean(
      profile.wakeTime ||
        profile.sleepTime ||
        profile.energyPattern ||
        (profile.personalPriorities as string[]).length ||
        profile.lifeVision,
    );
  },
};
