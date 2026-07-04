import { and, desc, eq } from "drizzle-orm";
import { db, companyTrackersTable, type InsertCompanyTracker, type CompanyTracker } from "@workspace/db";

export const companyService = {
  async list(userId: string): Promise<CompanyTracker[]> {
    return db.select().from(companyTrackersTable).where(eq(companyTrackersTable.userId, userId)).orderBy(desc(companyTrackersTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<CompanyTracker | undefined> {
    const [company] = await db.select().from(companyTrackersTable).where(and(eq(companyTrackersTable.id, id), eq(companyTrackersTable.userId, userId)));
    return company;
  },

  async findByName(userId: string, name: string): Promise<CompanyTracker | undefined> {
    const all = await this.list(userId);
    return all.find((c) => c.name.toLowerCase() === name.toLowerCase());
  },

  async create(userId: string, data: Omit<InsertCompanyTracker, "userId">): Promise<CompanyTracker> {
    const [company] = await db.insert(companyTrackersTable).values({ ...data, userId }).returning();
    if (!company) throw new Error("Failed to create company");
    return company;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertCompanyTracker, "userId">>): Promise<CompanyTracker | undefined> {
    const [company] = await db.update(companyTrackersTable).set(data).where(and(eq(companyTrackersTable.id, id), eq(companyTrackersTable.userId, userId))).returning();
    return company;
  },

  async remove(userId: string, id: string): Promise<CompanyTracker | undefined> {
    const [company] = await db.delete(companyTrackersTable).where(and(eq(companyTrackersTable.id, id), eq(companyTrackersTable.userId, userId))).returning();
    return company;
  },
};
