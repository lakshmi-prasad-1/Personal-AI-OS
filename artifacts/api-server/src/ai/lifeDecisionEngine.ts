import { decisionEngine, type Decision } from "./decisionEngine";
import { taskService } from "../services/taskService";
import { habitService } from "../services/habitService";
import { focusService } from "../services/focusService";
import { reminderService } from "../services/reminderService";
import { lifeProfileService } from "../services/lifeProfileService";
import { insightsService } from "../services/insightsService";

export interface LifeDecision {
  headline: string;
  reasoning: string;
  topActions: Decision[];
  context: {
    overdueTasks: number;
    dueTodayTasks: number;
    pendingHabits: number;
    dueReminders: number;
    isFocusing: boolean;
    energyPattern: string | null;
  };
}

/**
 * Phase 4, Module 6: Life Decision Engine. Answers "what should I do right
 * now?" by composing the existing decisionEngine (domain recommendations)
 * with real-time state (overdue tasks, due reminders, active focus session,
 * life profile energy pattern) into a single prioritized answer. This is
 * intentionally a new file that *composes* decisionEngine rather than
 * modifying it, so existing per-domain recommendation behavior is untouched.
 */
export const lifeDecisionEngine = {
  async decide(userId: string): Promise<LifeDecision> {
    const [decisions, taskStats, dueTasks, habitStatus, dueReminders, activeFocus, profile] = await Promise.all([
      decisionEngine.decide(userId),
      taskService.stats(userId),
      taskService.listDueToday(userId),
      habitService.getTodayStatus(userId),
      reminderService.due(userId),
      focusService.getActive(userId),
      lifeProfileService.getOrCreate(userId),
    ]);

    const pendingHabits = habitStatus.filter((h: { completedToday: boolean }) => !h.completedToday).length;
    const context = {
      overdueTasks: taskStats.overdue,
      dueTodayTasks: dueTasks.length,
      pendingHabits,
      dueReminders: dueReminders.length,
      isFocusing: Boolean(activeFocus),
      energyPattern: profile.energyPattern || null,
    };

    let headline: string;
    let reasoning: string;

    if (activeFocus) {
      headline = `Stay focused on "${activeFocus.title}"`;
      reasoning = `You're mid-session (${activeFocus.plannedMinutes}min planned). Finishing it protects the momentum you already have — everything else can wait a few more minutes.`;
    } else if (context.overdueTasks > 0) {
      headline = `Clear ${context.overdueTasks} overdue task${context.overdueTasks > 1 ? "s" : ""} first`;
      reasoning = "Overdue items compound stress and tend to get pushed further back the longer they sit — resolving them first clears mental space for everything else.";
    } else if (context.dueReminders > 0) {
      headline = `Handle ${context.dueReminders} due reminder${context.dueReminders > 1 ? "s" : ""}`;
      reasoning = "These reminders already hit their trigger time, so they're time-sensitive relative to everything else on your plate right now.";
    } else if (context.dueTodayTasks > 0) {
      const top = dueTasks.sort((a: { priority: string }, b: { priority: string }) => (a.priority === "urgent" ? -1 : b.priority === "urgent" ? 1 : 0))[0];
      headline = `Work on "${top?.title}"`;
      reasoning = `It's due today${top?.priority ? ` and marked ${top.priority} priority` : ""}, making it the highest-leverage task available right now.`;
    } else if (pendingHabits > 0) {
      headline = `Log your remaining habit${pendingHabits > 1 ? "s" : ""}`;
      reasoning = "No urgent tasks or reminders right now, so this is a good moment to protect your streaks before the day gets busier.";
    } else if (decisions.length > 0 && decisions[0]) {
      headline = decisions[0].title;
      reasoning = decisions[0].reason;
    } else {
      headline = "You're clear — good time for deep work or planning ahead";
      reasoning = "No overdue tasks, due reminders, or pending habits. This is a good window for focused, non-urgent work like studying, a side project, or planning tomorrow.";
    }

    if (context.energyPattern === "morning_person" && new Date().getHours() >= 20) {
      reasoning += " Note: it's late in the day for a morning person's peak energy — consider lighter or lower-focus tasks.";
    } else if (context.energyPattern === "night_owl" && new Date().getHours() < 9) {
      reasoning += " Note: it's early for a night owl's peak energy — consider lighter or lower-focus tasks until later.";
    }

    return {
      headline,
      reasoning,
      topActions: decisions.slice(0, 5),
      context,
    };
  },

  async insights(userId: string) {
    return insightsService.generate(userId);
  },
};
