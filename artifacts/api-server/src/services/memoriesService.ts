import { and, desc, eq } from "drizzle-orm";
import { db, memoriesTable, type InsertMemory, type Memory } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const memoriesService = {
  async list(userId: string): Promise<Memory[]> {
    return db
      .select()
      .from(memoriesTable)
      .where(eq(memoriesTable.userId, userId))
      .orderBy(desc(memoriesTable.importanceScore), desc(memoriesTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<Memory | undefined> {
    const [memory] = await db
      .select()
      .from(memoriesTable)
      .where(and(eq(memoriesTable.id, id), eq(memoriesTable.userId, userId)));
    return memory;
  },

  async create(userId: string, data: Omit<InsertMemory, "userId">): Promise<Memory> {
    const [memory] = await db
      .insert(memoriesTable)
      .values({ ...data, userId })
      .returning();
    if (!memory) throw new Error("Failed to create memory");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "memory",
      entityId: memory.id,
      label: memory.title,
      text: `${memory.title} ${memory.description}`,
      tags: memory.tags,
    });
    return memory;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertMemory, "userId">>): Promise<Memory | undefined> {
    const [memory] = await db
      .update(memoriesTable)
      .set(data)
      .where(and(eq(memoriesTable.id, id), eq(memoriesTable.userId, userId)))
      .returning();
    return memory;
  },

  async remove(userId: string, id: string): Promise<Memory | undefined> {
    const [memory] = await db
      .delete(memoriesTable)
      .where(and(eq(memoriesTable.id, id), eq(memoriesTable.userId, userId)))
      .returning();
    return memory;
  },
};
