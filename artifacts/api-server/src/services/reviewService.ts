import { and, desc, eq } from "drizzle-orm";
import { db, dailyReviewsTable, weeklyReviewsTable, tasksTable, focusSessionsTable, goalsTable } from "@workspace/db";
import type { DailyReview, WeeklyReview } from "@workspace/db";
import { taskService } from "./taskService";
import { habitService } from "./habitService";
import { focusService } from "./focusService";
import { goalService } from "./goalService";

function getWeekBounds(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // adjust to Mon
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

export const reviewService = {
  async getDailyReview(userId: string, date: string): Promise<DailyReview | undefined> {
    const [review] = await db
      .select()
      .from(dailyReviewsTable)
      .where(and(eq(dailyReviewsTable.userId, userId), eq(dailyReviewsTable.date, date)));
    return review;
  },

  async listDailyReviews(userId: string): Promise<DailyReview[]> {
    return db
      .select()
      .from(dailyReviewsTable)
      .where(eq(dailyReviewsTable.userId, userId))
      .orderBy(desc(dailyReviewsTable.date));
  },

  async generateDailyReview(userId: string, date: string): Promise<DailyReview> {
    // Gather stats
    const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.userId, userId));
    const todayTasks = allTasks.filter(
      (t) => t.completedAt && new Date(t.completedAt).toISOString().slice(0, 10) === date,
    );
    const dueTasks = allTasks.filter((t) => t.dueDate === date && !t.isDeleted);

    const focusStats = await focusService.todayStats(userId);
    const habitStats = await habitService.stats(userId);
    const goals = await goalService.list(userId);
    const activeGoals = goals.filter((g) => g.status === "active");

    const aiReview = `Daily review for ${date}: Completed ${todayTasks.length} tasks, focused for ${focusStats.totalMinutes} minutes, completed ${habitStats.completedToday}/${habitStats.totalToday} habits. ${activeGoals.length} active goals in progress.`;

    // Upsert review
    const existing = await this.getDailyReview(userId, date);
    if (existing) {
      const [updated] = await db
        .update(dailyReviewsTable)
        .set({
          tasksCompleted: todayTasks.length,
          tasksTotal: dueTasks.length,
          focusMinutes: focusStats.totalMinutes,
          habitsCompleted: habitStats.completedToday,
          habitsTotal: habitStats.totalToday,
          goalsProgress: activeGoals.map((g) => ({ title: g.title, progress: g.progressPercent })) as any,
          aiReview,
        })
        .where(and(eq(dailyReviewsTable.id, existing.id), eq(dailyReviewsTable.userId, userId)))
        .returning();
      return updated!;
    }

    const [review] = await db
      .insert(dailyReviewsTable)
      .values({
        userId,
        date,
        tasksCompleted: todayTasks.length,
        tasksTotal: dueTasks.length,
        focusMinutes: focusStats.totalMinutes,
        habitsCompleted: habitStats.completedToday,
        habitsTotal: habitStats.totalToday,
        goalsProgress: activeGoals.map((g) => ({ title: g.title, progress: g.progressPercent })) as any,
        aiReview,
      })
      .returning();
    if (!review) throw new Error("Failed to generate daily review");
    return review;
  },

  async getWeeklyReview(userId: string, weekStart: string): Promise<WeeklyReview | undefined> {
    const [review] = await db
      .select()
      .from(weeklyReviewsTable)
      .where(and(eq(weeklyReviewsTable.userId, userId), eq(weeklyReviewsTable.weekStart, weekStart)));
    return review;
  },

  async listWeeklyReviews(userId: string): Promise<WeeklyReview[]> {
    return db
      .select()
      .from(weeklyReviewsTable)
      .where(eq(weeklyReviewsTable.userId, userId))
      .orderBy(desc(weeklyReviewsTable.weekStart));
  },

  async generateWeeklyReview(userId: string): Promise<WeeklyReview> {
    const { start, end } = getWeekBounds(new Date());
    const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.userId, userId));
    const weekTasks = allTasks.filter((t) => {
      if (!t.completedAt) return false;
      const d = new Date(t.completedAt).toISOString().slice(0, 10);
      return d >= start && d <= end;
    });

    const allFocus = await db.select().from(focusSessionsTable).where(eq(focusSessionsTable.userId, userId));
    const weekFocusMinutes = allFocus
      .filter((f) => {
        if (!f.completedAt) return false;
        const d = new Date(f.completedAt).toISOString().slice(0, 10);
        return d >= start && d <= end;
      })
      .reduce((s, f) => s + (f.actualMinutes ?? 0), 0);

    const goals = await goalService.list(userId);
    const activeGoals = goals.filter((g) => g.status === "active");
    const habitStats = await habitService.stats(userId);

    const aiReview = `Week of ${start}–${end}: Completed ${weekTasks.length} tasks, focused for ${weekFocusMinutes} minutes. ${activeGoals.length} goals in progress.`;

    const existing = await this.getWeeklyReview(userId, start);
    if (existing) {
      const [updated] = await db
        .update(weeklyReviewsTable)
        .set({
          weekEnd: end,
          tasksCompleted: weekTasks.length,
          focusMinutes: weekFocusMinutes,
          goalsProgress: activeGoals.map((g) => ({ title: g.title, progress: g.progressPercent })) as any,
          aiReview,
        })
        .where(and(eq(weeklyReviewsTable.id, existing.id), eq(weeklyReviewsTable.userId, userId)))
        .returning();
      return updated!;
    }

    const [review] = await db
      .insert(weeklyReviewsTable)
      .values({
        userId,
        weekStart: start,
        weekEnd: end,
        tasksCompleted: weekTasks.length,
        focusMinutes: weekFocusMinutes,
        goalsProgress: activeGoals.map((g) => ({ title: g.title, progress: g.progressPercent })) as any,
        aiReview,
      })
      .returning();
    if (!review) throw new Error("Failed to generate weekly review");
    return review;
  },
};
