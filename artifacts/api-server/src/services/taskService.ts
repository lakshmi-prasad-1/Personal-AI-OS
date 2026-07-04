import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db, tasksTable, type InsertTask, type Task } from "@workspace/db";

export const taskService = {
  async list(userId: string, filters?: { status?: string; priority?: string; category?: string }): Promise<Task[]> {
    let query = db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.userId, userId),
          eq(tasksTable.isDeleted, false),
          isNull(tasksTable.parentId), // top-level only
          ...(filters?.status ? [eq(tasksTable.status, filters.status)] : []),
          ...(filters?.priority ? [eq(tasksTable.priority, filters.priority)] : []),
          ...(filters?.category ? [eq(tasksTable.category, filters.category)] : []),
        ),
      );
    return (query as any).orderBy(desc(tasksTable.createdAt));
  },

  async get(userId: string, id: string): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId), eq(tasksTable.isDeleted, false)));
    return task;
  },

  async create(userId: string, data: Omit<InsertTask, "userId">, chatId?: string): Promise<Task> {
    const [task] = await db
      .insert(tasksTable)
      .values({ ...data, userId })
      .returning();
    if (!task) throw new Error("Failed to create task");

    // Tasks are not yet linked to the knowledge graph (entity type not in graph schema)
    // Link added when the task is also a note/idea in future phase.

    return task;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertTask, "userId">>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasksTable)
      .set(data)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId), eq(tasksTable.isDeleted, false)))
      .returning();
    return task;
  },

  async complete(userId: string, id: string): Promise<Task | undefined> {
    const [task] = await db
      .update(tasksTable)
      .set({ status: "done", completedAt: new Date() })
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
      .returning();
    return task;
  },

  async remove(userId: string, id: string): Promise<Task | undefined> {
    // soft delete
    const [task] = await db
      .update(tasksTable)
      .set({ isDeleted: true })
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
      .returning();
    return task;
  },

  async listSubtasks(userId: string, parentId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.userId, userId), eq(tasksTable.parentId, parentId), eq(tasksTable.isDeleted, false)))
      .orderBy(desc(tasksTable.createdAt));
  },

  async listDueToday(userId: string): Promise<Task[]> {
    const today = new Date().toISOString().slice(0, 10);
    return db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.userId, userId),
          eq(tasksTable.isDeleted, false),
          ne(tasksTable.status, "done"),
          ne(tasksTable.status, "archived"),
          eq(tasksTable.dueDate, today),
        ),
      )
      .orderBy(desc(tasksTable.priority));
  },

  async listUpcoming(userId: string): Promise<Task[]> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.userId, userId),
          eq(tasksTable.isDeleted, false),
          ne(tasksTable.status, "done"),
          ne(tasksTable.status, "archived"),
        ),
      )
      .orderBy(tasksTable.dueDate);
    return rows.filter((t) => !t.dueDate || t.dueDate >= today).slice(0, 20);
  },

  async stats(userId: string): Promise<{ total: number; done: number; inProgress: number; overdue: number }> {
    const all = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.userId, userId), eq(tasksTable.isDeleted, false)));
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: all.length,
      done: all.filter((t) => t.status === "done").length,
      inProgress: all.filter((t) => t.status === "in_progress").length,
      overdue: all.filter((t) => t.dueDate && t.dueDate < today && t.status !== "done").length,
    };
  },
};
