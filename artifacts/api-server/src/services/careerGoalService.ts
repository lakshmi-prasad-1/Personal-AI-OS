import { and, desc, eq } from "drizzle-orm";
import { db, careerGoalsTable, type InsertCareerGoal, type CareerGoal } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const careerGoalService = {
  async list(userId: string): Promise<CareerGoal[]> {
    return db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, userId)).orderBy(desc(careerGoalsTable.updatedAt));
  },

  async create(userId: string, data: Omit<InsertCareerGoal, "userId">): Promise<CareerGoal> {
    const [goal] = await db.insert(careerGoalsTable).values({ ...data, userId }).returning();
    if (!goal) throw new Error("Failed to create career goal");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "career_goal",
      entityId: goal.id,
      label: goal.title,
      text: `${goal.title} ${goal.description} ${goal.targetRoles.join(" ")} ${goal.targetCompanies.join(" ")}`,
    });
    return goal;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertCareerGoal, "userId">>): Promise<CareerGoal | undefined> {
    const [goal] = await db.update(careerGoalsTable).set(data).where(and(eq(careerGoalsTable.id, id), eq(careerGoalsTable.userId, userId))).returning();
    return goal;
  },

  async remove(userId: string, id: string): Promise<CareerGoal | undefined> {
    const [goal] = await db.delete(careerGoalsTable).where(and(eq(careerGoalsTable.id, id), eq(careerGoalsTable.userId, userId))).returning();
    return goal;
  },
};
