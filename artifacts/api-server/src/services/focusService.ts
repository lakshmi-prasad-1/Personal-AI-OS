import { and, desc, eq } from "drizzle-orm";
import { db, focusSessionsTable, type InsertFocusSession, type FocusSession } from "@workspace/db";

export const focusService = {
  async list(userId: string): Promise<FocusSession[]> {
    return db
      .select()
      .from(focusSessionsTable)
      .where(eq(focusSessionsTable.userId, userId))
      .orderBy(desc(focusSessionsTable.createdAt));
  },

  async get(userId: string, id: string): Promise<FocusSession | undefined> {
    const [session] = await db
      .select()
      .from(focusSessionsTable)
      .where(and(eq(focusSessionsTable.id, id), eq(focusSessionsTable.userId, userId)));
    return session;
  },

  async getActive(userId: string): Promise<FocusSession | undefined> {
    const [session] = await db
      .select()
      .from(focusSessionsTable)
      .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "active")));
    return session;
  },

  async create(userId: string, data: Omit<InsertFocusSession, "userId">): Promise<FocusSession> {
    const [session] = await db
      .insert(focusSessionsTable)
      .values({ ...data, userId, status: "idle" })
      .returning();
    if (!session) throw new Error("Failed to create focus session");
    return session;
  },

  async start(userId: string, id: string): Promise<FocusSession | undefined> {
    const [session] = await db
      .update(focusSessionsTable)
      .set({ status: "active", startedAt: new Date(), pausedAt: null })
      .where(and(eq(focusSessionsTable.id, id), eq(focusSessionsTable.userId, userId)))
      .returning();
    return session;
  },

  async pause(userId: string, id: string): Promise<FocusSession | undefined> {
    const [session] = await db
      .update(focusSessionsTable)
      .set({ status: "paused", pausedAt: new Date() })
      .where(and(eq(focusSessionsTable.id, id), eq(focusSessionsTable.userId, userId)))
      .returning();
    return session;
  },

  async resume(userId: string, id: string): Promise<FocusSession | undefined> {
    const existing = await this.get(userId, id);
    if (!existing || !existing.pausedAt) return existing;

    const pauseMs = new Date().getTime() - new Date(existing.pausedAt).getTime();
    const extraPauseMinutes = Math.round(pauseMs / 60000);
    const [session] = await db
      .update(focusSessionsTable)
      .set({
        status: "active",
        pausedAt: null,
        totalPauseMinutes: existing.totalPauseMinutes + extraPauseMinutes,
      })
      .where(and(eq(focusSessionsTable.id, id), eq(focusSessionsTable.userId, userId)))
      .returning();
    return session;
  },

  async stop(userId: string, id: string, notes?: string): Promise<FocusSession | undefined> {
    const existing = await this.get(userId, id);
    if (!existing) return undefined;

    const now = new Date();
    let actualMinutes = 0;
    if (existing.startedAt) {
      actualMinutes = Math.round((now.getTime() - new Date(existing.startedAt).getTime()) / 60000) - existing.totalPauseMinutes;
    }

    const [session] = await db
      .update(focusSessionsTable)
      .set({
        status: "completed",
        completedAt: now,
        actualMinutes: Math.max(0, actualMinutes),
        ...(notes !== undefined ? { notes } : {}),
      })
      .where(and(eq(focusSessionsTable.id, id), eq(focusSessionsTable.userId, userId)))
      .returning();
    return session;
  },

  async cancel(userId: string, id: string): Promise<FocusSession | undefined> {
    const [session] = await db
      .update(focusSessionsTable)
      .set({ status: "cancelled" })
      .where(and(eq(focusSessionsTable.id, id), eq(focusSessionsTable.userId, userId)))
      .returning();
    return session;
  },

  async todayStats(userId: string): Promise<{ totalMinutes: number; sessions: number; pomodoroCount: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const all = await this.list(userId);
    const todaySessions = all.filter(
      (s) => s.completedAt && new Date(s.completedAt).toISOString().slice(0, 10) === today,
    );
    return {
      totalMinutes: todaySessions.reduce((s, f) => s + (f.actualMinutes ?? 0), 0),
      sessions: todaySessions.length,
      pomodoroCount: todaySessions.reduce((s, f) => s + f.pomodoroCount, 0),
    };
  },
};
