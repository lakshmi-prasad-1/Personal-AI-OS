import { and, desc, eq } from "drizzle-orm";
import { db, goalsTable, type InsertGoal, type Goal } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const goalService = {
  async list(userId: string): Promise<Goal[]> {
    return db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.userId, userId))
      .orderBy(desc(goalsTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<Goal | undefined> {
    const [goal] = await db
      .select()
      .from(goalsTable)
      .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, userId)));
    return goal;
  },

  async create(userId: string, data: Omit<InsertGoal, "userId">): Promise<Goal> {
    const [goal] = await db
      .insert(goalsTable)
      .values({ ...data, userId })
      .returning();
    if (!goal) throw new Error("Failed to create goal");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "goal",
      entityId: goal.id,
      label: goal.title,
      text: `${goal.title} ${goal.description ?? ""}`,
    });
    return goal;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertGoal, "userId">>): Promise<Goal | undefined> {
    const [goal] = await db
      .update(goalsTable)
      .set(data)
      .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, userId)))
      .returning();
    return goal;
  },

  async complete(userId: string, id: string): Promise<Goal | undefined> {
    const [goal] = await db
      .update(goalsTable)
      .set({ status: "completed", progressPercent: 100, completedAt: new Date() })
      .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, userId)))
      .returning();
    return goal;
  },

  async updateProgress(userId: string, id: string, progressPercent: number): Promise<Goal | undefined> {
    const clamped = Math.max(0, Math.min(100, progressPercent));
    const updates: Partial<InsertGoal> = { progressPercent: clamped };
    if (clamped === 100) {
      updates.status = "completed";
      updates.completedAt = new Date();
    }
    const [goal] = await db
      .update(goalsTable)
      .set(updates)
      .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, userId)))
      .returning();
    return goal;
  },

  async remove(userId: string, id: string): Promise<Goal | undefined> {
    const [goal] = await db
      .delete(goalsTable)
      .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, userId)))
      .returning();
    return goal;
  },

  async stats(userId: string) {
    const goals = await this.list(userId);
    const active = goals.filter((g) => g.status === "active");
    const completed = goals.filter((g) => g.status === "completed");
    const avgProgress = active.length
      ? Math.round(active.reduce((s, g) => s + g.progressPercent, 0) / active.length)
      : 0;
    return { total: goals.length, active: active.length, completed: completed.length, avgProgress };
  },
};
