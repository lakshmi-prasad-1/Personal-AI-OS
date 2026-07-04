import { and, desc, eq } from "drizzle-orm";
import { db, skillsTable, type InsertSkill, type Skill } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const skillService = {
  async list(userId: string): Promise<Skill[]> {
    return db.select().from(skillsTable).where(eq(skillsTable.userId, userId)).orderBy(desc(skillsTable.updatedAt));
  },

  async findByName(userId: string, name: string): Promise<Skill | undefined> {
    const skills = await this.list(userId);
    return skills.find((s) => s.name.toLowerCase() === name.toLowerCase());
  },

  async create(userId: string, data: Omit<InsertSkill, "userId">): Promise<Skill> {
    const [skill] = await db.insert(skillsTable).values({ ...data, userId }).returning();
    if (!skill) throw new Error("Failed to create skill");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "skill",
      entityId: skill.id,
      label: skill.name,
      text: `${skill.name} ${skill.category} ${skill.level}`,
    });
    return skill;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertSkill, "userId">>): Promise<Skill | undefined> {
    const [skill] = await db.update(skillsTable).set(data).where(and(eq(skillsTable.id, id), eq(skillsTable.userId, userId))).returning();
    return skill;
  },

  async remove(userId: string, id: string): Promise<Skill | undefined> {
    const [skill] = await db.delete(skillsTable).where(and(eq(skillsTable.id, id), eq(skillsTable.userId, userId))).returning();
    return skill;
  },

  async stats(userId: string) {
    const skills = await this.list(userId);
    return {
      total: skills.length,
      byCategory: skills.reduce<Record<string, number>>((acc, s) => { acc[s.category] = (acc[s.category] ?? 0) + 1; return acc; }, {}),
      avgConfidence: skills.length ? Math.round(skills.reduce((sum, s) => sum + s.confidence, 0) / skills.length) : 0,
    };
  },
};
