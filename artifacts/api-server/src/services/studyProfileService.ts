import { eq } from "drizzle-orm";
import { db, studyProfilesTable, type InsertStudyProfile, type StudyProfile } from "@workspace/db";

export const studyProfileService = {
  async get(userId: string): Promise<StudyProfile | undefined> {
    const [profile] = await db.select().from(studyProfilesTable).where(eq(studyProfilesTable.userId, userId));
    return profile;
  },

  async getOrCreate(userId: string): Promise<StudyProfile> {
    const existing = await this.get(userId);
    if (existing) return existing;
    const [created] = await db.insert(studyProfilesTable).values({ userId }).returning();
    if (!created) throw new Error("Failed to create study profile");
    return created;
  },

  async upsert(userId: string, data: Partial<Omit<InsertStudyProfile, "userId">>): Promise<StudyProfile> {
    const existing = await this.get(userId);
    if (existing) {
      const [updated] = await db
        .update(studyProfilesTable)
        .set(data)
        .where(eq(studyProfilesTable.userId, userId))
        .returning();
      if (!updated) throw new Error("Failed to update study profile");
      return updated;
    }
    const [created] = await db.insert(studyProfilesTable).values({ ...data, userId }).returning();
    if (!created) throw new Error("Failed to create study profile");
    return created;
  },
};
