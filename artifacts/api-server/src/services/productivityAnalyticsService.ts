import { eq } from "drizzle-orm";
import { db, tasksTable, habitLogsTable, focusSessionsTable, goalsTable } from "@workspace/db";

export interface ProductivityTrendPoint {
  date: string;
  tasksCompleted: number;
  focusMinutes: number;
  habitsCompleted: number;
}

export interface ProductivityAnalytics {
  rangeDays: number;
  trend: ProductivityTrendPoint[];
  totals: { tasksCompleted: number; focusMinutes: number; habitsCompleted: number };
  averages: { tasksPerDay: number; focusMinutesPerDay: number; habitsPerDay: number };
  mostProductiveDay: string | null;
  taskCompletionRate: number;
  activeGoalsCount: number;
  streakSummary: { longestCurrentStreak: number };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Phase 4, Module 9: Productivity Analytics. Read-only aggregation over
 * existing tasks/habits/focus/goals tables — no new tracking tables needed.
 */
export const productivityAnalyticsService = {
  async compute(userId: string, days = 30): Promise<ProductivityAnalytics> {
    const [tasks, habitLogs, focusSessions, goals] = await Promise.all([
      db.select().from(tasksTable).where(eq(tasksTable.userId, userId)),
      db.select().from(habitLogsTable).where(eq(habitLogsTable.userId, userId)),
      db.select().from(focusSessionsTable).where(eq(focusSessionsTable.userId, userId)),
      db.select().from(goalsTable).where(eq(goalsTable.userId, userId)),
    ]);

    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const byDay = new Map<string, ProductivityTrendPoint>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 86_400_000);
      const key = dayKey(d);
      byDay.set(key, { date: key, tasksCompleted: 0, focusMinutes: 0, habitsCompleted: 0 });
    }

    for (const t of tasks) {
      if (!t.completedAt) continue;
      const key = dayKey(new Date(t.completedAt));
      const point = byDay.get(key);
      if (point) point.tasksCompleted += 1;
    }
    for (const h of habitLogs) {
      if (!h.completed) continue;
      const key = dayKey(new Date(h.date));
      const point = byDay.get(key);
      if (point) point.habitsCompleted += 1;
    }
    for (const f of focusSessions) {
      if (!f.completedAt) continue;
      const key = dayKey(new Date(f.completedAt));
      const point = byDay.get(key);
      if (point) point.focusMinutes += f.actualMinutes ?? 0;
    }

    const trend = Array.from(byDay.values());
    const totals = trend.reduce(
      (acc, p) => ({
        tasksCompleted: acc.tasksCompleted + p.tasksCompleted,
        focusMinutes: acc.focusMinutes + p.focusMinutes,
        habitsCompleted: acc.habitsCompleted + p.habitsCompleted,
      }),
      { tasksCompleted: 0, focusMinutes: 0, habitsCompleted: 0 },
    );

    const mostProductive = trend.reduce<ProductivityTrendPoint | null>((best, p) => {
      const score = p.tasksCompleted + p.habitsCompleted + p.focusMinutes / 30;
      const bestScore = best ? best.tasksCompleted + best.habitsCompleted + best.focusMinutes / 30 : -1;
      return score > bestScore ? p : best;
    }, null);

    const nonDeleted = tasks.filter((t) => !t.isDeleted);
    const completionRate = nonDeleted.length ? nonDeleted.filter((t) => t.status === "done").length / nonDeleted.length : 0;

    return {
      rangeDays: days,
      trend,
      totals,
      averages: {
        tasksPerDay: Number((totals.tasksCompleted / days).toFixed(2)),
        focusMinutesPerDay: Number((totals.focusMinutes / days).toFixed(2)),
        habitsPerDay: Number((totals.habitsCompleted / days).toFixed(2)),
      },
      mostProductiveDay: mostProductive && (mostProductive.tasksCompleted || mostProductive.habitsCompleted || mostProductive.focusMinutes) ? mostProductive.date : null,
      taskCompletionRate: Number(completionRate.toFixed(2)),
      activeGoalsCount: goals.filter((g) => g.status === "active").length,
      streakSummary: { longestCurrentStreak: 0 },
    };
  },
};
