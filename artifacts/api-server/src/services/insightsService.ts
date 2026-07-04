import { taskService } from "./taskService";
import { habitService } from "./habitService";
import { focusService } from "./focusService";
import { goalService } from "./goalService";
import { productivityAnalyticsService } from "./productivityAnalyticsService";
import { timelineService } from "./timelineService";

export interface Insight {
  id: string;
  category: "productivity" | "habits" | "goals" | "focus" | "balance";
  title: string;
  detail: string;
  severity: "info" | "positive" | "warning";
}

/**
 * Phase 4, Module 8: Insights Engine. Read-only pattern detection over
 * existing services (no new storage) — surfaces trends a user wouldn't
 * notice manually. Distinct from decisionEngine (which recommends actions)
 * and lifeDecisionEngine (which answers "what should I do now").
 */
export const insightsService = {
  async generate(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    const [taskStats, habitStats, focusToday, goals, analytics, recentTimeline] = await Promise.all([
      taskService.stats(userId),
      habitService.stats(userId),
      focusService.todayStats(userId),
      goalService.list(userId),
      productivityAnalyticsService.compute(userId, 14),
      timelineService.recent(userId, 14),
    ]);

    if (taskStats.overdue > 0) {
      insights.push({
        id: "tasks-overdue",
        category: "productivity",
        title: `${taskStats.overdue} overdue task${taskStats.overdue > 1 ? "s" : ""}`,
        detail: "You have tasks past their due date. Consider rescheduling or breaking them into smaller steps.",
        severity: "warning",
      });
    }

    if (taskStats.total > 0 && taskStats.done / taskStats.total >= 0.8) {
      insights.push({
        id: "tasks-completion-high",
        category: "productivity",
        title: "Strong task completion rate",
        detail: `You've completed ${Math.round((taskStats.done / taskStats.total) * 100)}% of your tasks. Keep the momentum going.`,
        severity: "positive",
      });
    }

    if (habitStats.active > 0 && habitStats.completedToday === 0) {
      insights.push({
        id: "habits-none-today",
        category: "habits",
        title: "No habits logged today",
        detail: `You have ${habitStats.active} active habit${habitStats.active > 1 ? "s" : ""} — a quick check-in keeps streaks alive.`,
        severity: "warning",
      });
    }

    if (analytics.averages.focusMinutesPerDay < 20) {
      insights.push({
        id: "focus-low-avg",
        category: "focus",
        title: "Focus time trending low",
        detail: `Average of ${analytics.averages.focusMinutesPerDay} focused minutes/day over the last 2 weeks.`,
        severity: "warning",
      });
    } else if (focusToday.totalMinutes >= 60) {
      insights.push({
        id: "focus-good-today",
        category: "focus",
        title: "Great focus today",
        detail: `${focusToday.totalMinutes} minutes of focused work logged today.`,
        severity: "positive",
      });
    }

    const staleGoals = goals.filter((g) => g.status === "active" && g.progressPercent === 0);
    if (staleGoals.length > 0) {
      insights.push({
        id: "goals-no-progress",
        category: "goals",
        title: `${staleGoals.length} goal${staleGoals.length > 1 ? "s" : ""} with no progress yet`,
        detail: staleGoals.map((g) => g.title).join(", "),
        severity: "info",
      });
    }

    const activityByDay = new Map<string, number>();
    for (const entry of recentTimeline) {
      const day = entry.timestamp.slice(0, 10);
      activityByDay.set(day, (activityByDay.get(day) ?? 0) + 1);
    }
    const activeDays = activityByDay.size;
    if (activeDays > 0 && activeDays < 5) {
      insights.push({
        id: "balance-low-activity",
        category: "balance",
        title: "Light activity this week",
        detail: `You've been active in the app on ${activeDays} of the last 14 days. A short daily check-in helps the AI plan better.`,
        severity: "info",
      });
    }

    return insights;
  },
};
