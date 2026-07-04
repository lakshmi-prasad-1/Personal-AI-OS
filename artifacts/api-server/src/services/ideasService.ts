import { and, desc, eq } from "drizzle-orm";
import { db, ideasTable, type InsertIdea, type Idea } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const ideasService = {
  async list(userId: string): Promise<Idea[]> {
    return db.select().from(ideasTable).where(eq(ideasTable.userId, userId)).orderBy(desc(ideasTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<Idea | undefined> {
    const [idea] = await db
      .select()
      .from(ideasTable)
      .where(and(eq(ideasTable.id, id), eq(ideasTable.userId, userId)));
    return idea;
  },

  async create(userId: string, data: Omit<InsertIdea, "userId">): Promise<Idea> {
    const [idea] = await db
      .insert(ideasTable)
      .values({ ...data, userId })
      .returning();
    if (!idea) throw new Error("Failed to create idea");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "idea",
      entityId: idea.id,
      label: idea.title,
      text: `${idea.title} ${idea.content}`,
      tags: idea.tags,
    });
    return idea;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertIdea, "userId">>): Promise<Idea | undefined> {
    const [idea] = await db
      .update(ideasTable)
      .set(data)
      .where(and(eq(ideasTable.id, id), eq(ideasTable.userId, userId)))
      .returning();
    return idea;
  },

  async remove(userId: string, id: string): Promise<Idea | undefined> {
    const [idea] = await db
      .delete(ideasTable)
      .where(and(eq(ideasTable.id, id), eq(ideasTable.userId, userId)))
      .returning();
    return idea;
  },
};
