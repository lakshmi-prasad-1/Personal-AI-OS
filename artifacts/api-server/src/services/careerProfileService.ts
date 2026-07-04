import { eq } from "drizzle-orm";
import { db, careerProfilesTable, type InsertCareerProfile, type CareerProfile } from "@workspace/db";

export const careerProfileService = {
  async getOrCreate(userId: string): Promise<CareerProfile> {
    const [existing] = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
    if (existing) return existing;
    const [created] = await db.insert(careerProfilesTable).values({ userId }).returning();
    if (!created) throw new Error("Failed to create career profile");
    return created;
  },

  async upsert(userId: string, data: Partial<Omit<InsertCareerProfile, "userId">>): Promise<CareerProfile> {
    await this.getOrCreate(userId);
    const [updated] = await db.update(careerProfilesTable).set(data).where(eq(careerProfilesTable.userId, userId)).returning();
    if (!updated) throw new Error("Failed to update career profile");
    return updated;
  },
};
