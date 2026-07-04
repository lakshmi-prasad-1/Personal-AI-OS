import { and, desc, eq } from "drizzle-orm";
import { db, jobApplicationsTable, type InsertJobApplication, type JobApplication } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const applicationService = {
  async list(userId: string): Promise<JobApplication[]> {
    return db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.userId, userId)).orderBy(desc(jobApplicationsTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<JobApplication | undefined> {
    const [app] = await db.select().from(jobApplicationsTable).where(and(eq(jobApplicationsTable.id, id), eq(jobApplicationsTable.userId, userId)));
    return app;
  },

  async create(userId: string, data: Omit<InsertJobApplication, "userId">): Promise<JobApplication> {
    const [app] = await db.insert(jobApplicationsTable).values({ ...data, userId }).returning();
    if (!app) throw new Error("Failed to create application");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "job_application",
      entityId: app.id,
      label: `${app.role} at ${app.company}`,
      text: `${app.role} ${app.company} ${app.location ?? ""} ${app.jobDescription.slice(0, 300)}`,
      tags: [app.status, app.workType ?? ""].filter(Boolean),
    });
    return app;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertJobApplication, "userId">>): Promise<JobApplication | undefined> {
    const current = await this.get(userId, id);
    if (!current) return undefined;
    // Append timeline entry if status changed
    let timeline = (current.timeline as { date: string; event: string; notes: string }[]) ?? [];
    if (data.status && data.status !== current.status) {
      timeline = [...timeline, { date: new Date().toISOString().slice(0, 10), event: `Status → ${data.status}`, notes: "" }];
      data = { ...data, timeline };
    }
    const [app] = await db.update(jobApplicationsTable).set(data).where(and(eq(jobApplicationsTable.id, id), eq(jobApplicationsTable.userId, userId))).returning();
    return app;
  },

  async remove(userId: string, id: string): Promise<JobApplication | undefined> {
    const [app] = await db.delete(jobApplicationsTable).where(and(eq(jobApplicationsTable.id, id), eq(jobApplicationsTable.userId, userId))).returning();
    return app;
  },

  async stats(userId: string) {
    const all = await this.list(userId);
    const byStatus = all.reduce<Record<string, number>>((acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; }, {});
    return { total: all.length, byStatus, activeCount: all.filter((a) => !["rejected", "withdrawn"].includes(a.status)).length };
  },
};
