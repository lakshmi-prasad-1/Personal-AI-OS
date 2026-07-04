import { and, desc, eq } from "drizzle-orm";
import { db, habitsTable, habitLogsTable, type InsertHabit, type Habit, type HabitLog } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const habitService = {
  async list(userId: string): Promise<Habit[]> {
    return db.select().from(habitsTable).where(eq(habitsTable.userId, userId)).orderBy(desc(habitsTable.createdAt));
  },

  async get(userId: string, id: string): Promise<Habit | undefined> {
    const [habit] = await db.select().from(habitsTable).where(and(eq(habitsTable.id, id), eq(habitsTable.userId, userId)));
    return habit;
  },

  async create(userId: string, data: Omit<InsertHabit, "userId">): Promise<Habit> {
    const [habit] = await db.insert(habitsTable).values({ ...data, userId }).returning();
    if (!habit) throw new Error("Failed to create habit");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "habit",
      entityId: habit.id,
      label: habit.name,
      text: `${habit.name} ${habit.description ?? ""}`,
    });
    return habit;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertHabit, "userId">>): Promise<Habit | undefined> {
    const [habit] = await db
      .update(habitsTable)
      .set(data)
      .where(and(eq(habitsTable.id, id), eq(habitsTable.userId, userId)))
      .returning();
    return habit;
  },

  async remove(userId: string, id: string): Promise<Habit | undefined> {
    const [habit] = await db
      .delete(habitsTable)
      .where(and(eq(habitsTable.id, id), eq(habitsTable.userId, userId)))
      .returning();
    return habit;
  },

  async logToday(userId: string, habitId: string, completed: boolean, notes?: string): Promise<HabitLog> {
    // Verify ownership before any write
    const [owned] = await db
      .select()
      .from(habitsTable)
      .where(and(eq(habitsTable.id, habitId), eq(habitsTable.userId, userId)));
    if (!owned) throw new Error("Habit not found");

    const today = new Date().toISOString().slice(0, 10);
    // Upsert: delete existing log for today then insert
    await db
      .delete(habitLogsTable)
      .where(and(eq(habitLogsTable.habitId, habitId), eq(habitLogsTable.userId, userId), eq(habitLogsTable.date, today)));
    const [log] = await db
      .insert(habitLogsTable)
      .values({ habitId, userId, date: today, completed, notes: notes ?? "" })
      .returning();
    if (!log) throw new Error("Failed to log habit");

    // Update streak
    await this._recalcStreak(userId, habitId);
    return log;
  },

  async getLogs(userId: string, habitId: string, days = 30): Promise<HabitLog[]> {
    const logs = await db
      .select()
      .from(habitLogsTable)
      .where(and(eq(habitLogsTable.habitId, habitId), eq(habitLogsTable.userId, userId)))
      .orderBy(desc(habitLogsTable.date));
    return logs.slice(0, days);
  },

  async getTodayStatus(userId: string): Promise<{ habit: Habit; completedToday: boolean }[]> {
    const today = new Date().toISOString().slice(0, 10);
    const habits = await this.list(userId);
    const todayLogs = await db
      .select()
      .from(habitLogsTable)
      .where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.date, today)));
    const completedIds = new Set(todayLogs.filter((l) => l.completed).map((l) => l.habitId));
    return habits
      .filter((h) => h.isActive)
      .map((habit) => ({ habit, completedToday: completedIds.has(habit.id) }));
  },

  async _recalcStreak(userId: string, habitId: string): Promise<void> {
    const logs = await db
      .select()
      .from(habitLogsTable)
      .where(and(eq(habitLogsTable.habitId, habitId), eq(habitLogsTable.userId, userId), eq(habitLogsTable.completed, true)))
      .orderBy(desc(habitLogsTable.date));

    let streak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const log of logs) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - logDate.getTime()) / 86400000);
      if (diff === streak) {
        streak++;
      } else {
        break;
      }
    }

    const habit = await db.select().from(habitsTable).where(and(eq(habitsTable.id, habitId), eq(habitsTable.userId, userId)));
    const currentLongest = habit[0]?.longestStreak ?? 0;
    await db
      .update(habitsTable)
      .set({ currentStreak: streak, longestStreak: Math.max(streak, currentLongest) })
      .where(and(eq(habitsTable.id, habitId), eq(habitsTable.userId, userId)));
  },

  async stats(userId: string) {
    const habits = await this.list(userId);
    const active = habits.filter((h) => h.isActive);
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = await db
      .select()
      .from(habitLogsTable)
      .where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.date, today), eq(habitLogsTable.completed, true)));
    return {
      total: habits.length,
      active: active.length,
      completedToday: todayLogs.length,
      totalToday: active.length,
    };
  },
};
