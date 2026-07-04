import { and, desc, eq } from "drizzle-orm";
import { db, notesTable, type InsertNote, type Note } from "@workspace/db";

export const notesService = {
  async list(userId: string): Promise<Note[]> {
    return db
      .select()
      .from(notesTable)
      .where(eq(notesTable.userId, userId))
      .orderBy(desc(notesTable.isPinned), desc(notesTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<Note | undefined> {
    const [note] = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)));
    return note;
  },

  async create(userId: string, data: Omit<InsertNote, "userId">): Promise<Note> {
    const [note] = await db
      .insert(notesTable)
      .values({ ...data, userId })
      .returning();
    if (!note) throw new Error("Failed to create note");
    return note;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertNote, "userId">>): Promise<Note | undefined> {
    const [note] = await db
      .update(notesTable)
      .set(data)
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
      .returning();
    return note;
  },

  async remove(userId: string, id: string): Promise<Note | undefined> {
    const [note] = await db
      .delete(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
      .returning();
    return note;
  },
};
