import { and, asc, desc, eq, lte } from "drizzle-orm";
import { db, remindersTable, type InsertReminder, type Reminder } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const reminderService = {
  async list(userId: string): Promise<Reminder[]> {
    return db
      .select()
      .from(remindersTable)
      .where(and(eq(remindersTable.userId, userId), eq(remindersTable.isCompleted, false)))
      .orderBy(asc(remindersTable.remindAt));
  },

  async get(userId: string, id: string): Promise<Reminder | undefined> {
    const [reminder] = await db
      .select()
      .from(remindersTable)
      .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, userId)));
    return reminder;
  },

  async create(userId: string, data: Omit<InsertReminder, "userId">): Promise<Reminder> {
    const [reminder] = await db
      .insert(remindersTable)
      .values({ ...data, userId })
      .returning();
    if (!reminder) throw new Error("Failed to create reminder");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "reminder",
      entityId: reminder.id,
      label: reminder.title,
      text: `${reminder.title} ${reminder.body ?? ""}`,
    });
    return reminder;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertReminder, "userId">>): Promise<Reminder | undefined> {
    const [reminder] = await db
      .update(remindersTable)
      .set(data)
      .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, userId)))
      .returning();
    return reminder;
  },

  async complete(userId: string, id: string): Promise<Reminder | undefined> {
    const [reminder] = await db
      .update(remindersTable)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, userId)))
      .returning();
    return reminder;
  },

  async snooze(userId: string, id: string, until: Date): Promise<Reminder | undefined> {
    const [reminder] = await db
      .update(remindersTable)
      .set({ isSnoozed: true, snoozedUntil: until, remindAt: until })
      .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, userId)))
      .returning();
    return reminder;
  },

  async remove(userId: string, id: string): Promise<Reminder | undefined> {
    const [reminder] = await db
      .delete(remindersTable)
      .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, userId)))
      .returning();
    return reminder;
  },

  async upcoming(userId: string, limit = 5): Promise<Reminder[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 48 * 3600 * 1000);
    const all = await db
      .select()
      .from(remindersTable)
      .where(and(eq(remindersTable.userId, userId), eq(remindersTable.isCompleted, false)))
      .orderBy(asc(remindersTable.remindAt));
    return all.slice(0, limit);
  },

  async due(userId: string): Promise<Reminder[]> {
    const now = new Date();
    return db
      .select()
      .from(remindersTable)
      .where(
        and(
          eq(remindersTable.userId, userId),
          eq(remindersTable.isCompleted, false),
          eq(remindersTable.isSnoozed, false),
          lte(remindersTable.remindAt, now),
        ),
      )
      .orderBy(asc(remindersTable.remindAt));
  },
};
