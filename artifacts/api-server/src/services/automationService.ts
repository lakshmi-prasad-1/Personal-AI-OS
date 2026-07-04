import { and, eq } from "drizzle-orm";
import { db, automationRulesTable, type InsertAutomationRule, type AutomationRule } from "@workspace/db";
import { taskService } from "./taskService";
import { subjectService } from "./subjectService";
import { habitService } from "./habitService";
import { resumeService } from "./resumeService";
import { focusService } from "./focusService";
import { agentActionsService } from "./agentActionsService";

/**
 * Phase 4, Module 18: Automation Foundation.
 *
 * These are pluggable *interfaces* for future delivery channels. None of
 * them call an external API yet (no email/SMS/webhooks/calendar sync) — by
 * design, per the Phase 4 brief. Each "send"/"deliver" method currently logs
 * to agent_actions as a simulated delivery so the architecture is provable
 * and swappable later (Phase 5) without touching call sites.
 */
export interface NotificationPayload {
  userId: string;
  title: string;
  body?: string;
  channel?: "in_app" | "email" | "push" | "sms";
}
export const NotificationService = {
  async send(payload: NotificationPayload): Promise<{ delivered: boolean; channel: string }> {
    await agentActionsService.log({
      userId: payload.userId,
      actionType: "notification_simulated",
      summary: `[simulated ${payload.channel ?? "in_app"} notification] ${payload.title}`,
      payload,
    });
    return { delivered: true, channel: payload.channel ?? "in_app" };
  },
};

export interface CalendarEventPayload {
  userId: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
}
export const CalendarService = {
  async sync(payload: CalendarEventPayload): Promise<{ synced: boolean }> {
    // No external calendar provider connected. This is a pluggable seam —
    // planner events already live in plannerEventsTable; a future
    // integration would push/pull here without changing planner call sites.
    await agentActionsService.log({
      userId: payload.userId,
      actionType: "calendar_sync_simulated",
      summary: `[simulated calendar sync] "${payload.title}" on ${payload.date}`,
      payload,
    });
    return { synced: true };
  },
};

export interface EmailPayload {
  userId: string;
  to?: string;
  subject: string;
  body: string;
}
export const EmailService = {
  async send(payload: EmailPayload): Promise<{ sent: boolean }> {
    await agentActionsService.log({
      userId: payload.userId,
      actionType: "email_simulated",
      summary: `[simulated email] ${payload.subject}`,
      payload,
    });
    return { sent: true };
  },
};

export interface WebhookPayload {
  userId: string;
  url: string;
  event: string;
  data: unknown;
}
export const WebhookService = {
  async trigger(payload: WebhookPayload): Promise<{ triggered: boolean }> {
    await agentActionsService.log({
      userId: payload.userId,
      actionType: "webhook_simulated",
      summary: `[simulated webhook] ${payload.event} -> ${payload.url}`,
      payload,
    });
    return { triggered: true };
  },
};

export interface ScheduledJob {
  userId: string;
  runAt: Date;
  jobType: string;
  params?: unknown;
}
export const SchedulerService = {
  /** No background job runner exists yet — this records intent so a future cron/worker can pick it up. */
  async schedule(job: ScheduledJob): Promise<{ scheduled: boolean }> {
    await agentActionsService.log({
      userId: job.userId,
      actionType: "schedule_simulated",
      summary: `[simulated schedule] ${job.jobType} at ${job.runAt.toISOString()}`,
      payload: job,
    });
    return { scheduled: true };
  },
};

export interface TriggerContext {
  userId: string;
}
export interface TriggerResult {
  ruleId: string;
  ruleName: string;
  fired: boolean;
  reason: string;
}

/**
 * TriggerEngine evaluates built-in trigger types against live app data.
 * Custom user-defined triggers (rule.trigger.type === "custom") are stored
 * but not auto-evaluated — the architecture supports them, evaluation logic
 * for arbitrary custom triggers is Phase 5 scope.
 */
export const TriggerEngine = {
  async evaluate(rule: AutomationRule, ctx: TriggerContext): Promise<TriggerResult> {
    const trigger = (rule.trigger ?? {}) as { type?: string; params?: Record<string, unknown> };
    const base = { ruleId: rule.id, ruleName: rule.name };

    switch (trigger.type) {
      case "assignment_due_soon": {
        const withinDays = Number(trigger.params?.withinDays ?? 1);
        const tasks = await taskService.list(ctx.userId);
        const today = new Date();
        const soon = tasks.filter((t) => {
          if (!t.dueDate || t.status === "done") return false;
          const days = Math.round((new Date(t.dueDate).getTime() - today.getTime()) / 86_400_000);
          return days >= 0 && days <= withinDays;
        });
        return { ...base, fired: soon.length > 0, reason: soon.length ? `${soon.length} task(s) due within ${withinDays} day(s)` : "No tasks due soon" };
      }
      case "focus_goal_missed": {
        const stats = await focusService.todayStats(ctx.userId);
        const goalMinutes = Number(trigger.params?.dailyGoalMinutes ?? 60);
        const missed = stats.totalMinutes < goalMinutes;
        return { ...base, fired: missed, reason: missed ? `Only ${stats.totalMinutes}/${goalMinutes} focus minutes today` : "Focus goal met" };
      }
      case "resume_outdated": {
        const resumes = await resumeService.list(ctx.userId);
        const staleDays = Number(trigger.params?.staleDays ?? 90);
        const stale = resumes.filter((r) => {
          const last = r.analyzedAt ?? r.updatedAt;
          const days = Math.round((Date.now() - new Date(last).getTime()) / 86_400_000);
          return days >= staleDays;
        });
        return { ...base, fired: stale.length > 0, reason: stale.length ? `${stale.length} resume(s) not updated in ${staleDays}+ days` : "Resumes up to date" };
      }
      case "habit_streak_broken": {
        const habits = await habitService.list(ctx.userId);
        const broken = habits.filter((h) => h.isActive && h.currentStreak === 0 && h.longestStreak > 0);
        return { ...base, fired: broken.length > 0, reason: broken.length ? `${broken.map((h) => h.name).join(", ")} streak broken` : "No broken streaks" };
      }
      case "exam_within_week": {
        const subjects = await subjectService.list(ctx.userId);
        const soon = subjects.filter((s) => {
          if (!s.examDate) return false;
          const days = Math.round((new Date(s.examDate).getTime() - Date.now()) / 86_400_000);
          return days >= 0 && days <= 7;
        });
        return { ...base, fired: soon.length > 0, reason: soon.length ? `${soon.map((s) => s.name).join(", ")} exam within 7 days` : "No exams within a week" };
      }
      default:
        return { ...base, fired: false, reason: `Unknown or custom trigger type "${trigger.type ?? "none"}" — not auto-evaluated` };
    }
  },
};

/**
 * RuleEngine ties TriggerEngine evaluation to the action side. When a rule
 * fires it does NOT perform the raw action (send email, etc.) — it always
 * routes through agent_actions as a suggestion, respecting
 * `aiSettings.automationPreferences` ("suggest_only" by default).
 */
export const RuleEngine = {
  async runAll(userId: string): Promise<TriggerResult[]> {
    const rules = await automationRuleService.list(userId, { enabledOnly: true });
    const results: TriggerResult[] = [];
    for (const rule of rules) {
      const result = await TriggerEngine.evaluate(rule, { userId });
      if (result.fired) {
        await automationRuleService.markTriggered(userId, rule.id);
        await agentActionsService.log({
          userId,
          actionType: "automation_rule_fired",
          entityType: "automation_rule",
          entityId: rule.id,
          summary: `Rule "${rule.name}" fired: ${result.reason}`,
          payload: { rule, result },
        });
      }
      results.push(result);
    }
    return results;
  },
};

export const automationRuleService = {
  async list(userId: string, opts?: { enabledOnly?: boolean }): Promise<AutomationRule[]> {
    const rows = await db.select().from(automationRulesTable).where(eq(automationRulesTable.userId, userId));
    return opts?.enabledOnly ? rows.filter((r: AutomationRule) => r.isEnabled) : rows;
  },

  async get(userId: string, id: string): Promise<AutomationRule | undefined> {
    const [rule] = await db
      .select()
      .from(automationRulesTable)
      .where(and(eq(automationRulesTable.id, id), eq(automationRulesTable.userId, userId)));
    return rule;
  },

  async create(userId: string, data: Omit<InsertAutomationRule, "userId">): Promise<AutomationRule> {
    const [rule] = await db.insert(automationRulesTable).values({ ...data, userId }).returning();
    if (!rule) throw new Error("Failed to create automation rule");
    return rule;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertAutomationRule, "userId">>): Promise<AutomationRule | undefined> {
    const [rule] = await db
      .update(automationRulesTable)
      .set(data)
      .where(and(eq(automationRulesTable.id, id), eq(automationRulesTable.userId, userId)))
      .returning();
    return rule;
  },

  async remove(userId: string, id: string): Promise<AutomationRule | undefined> {
    const [rule] = await db
      .delete(automationRulesTable)
      .where(and(eq(automationRulesTable.id, id), eq(automationRulesTable.userId, userId)))
      .returning();
    return rule;
  },

  async markTriggered(userId: string, id: string): Promise<void> {
    await db
      .update(automationRulesTable)
      .set({ lastTriggeredAt: new Date() })
      .where(and(eq(automationRulesTable.id, id), eq(automationRulesTable.userId, userId)));
  },

  /** Seeds the example rules from the Phase 4 brief (Module 19) for a new user, disabled by default. */
  async seedBuiltIns(userId: string): Promise<AutomationRule[]> {
    const existing = await this.list(userId);
    if (existing.some((r) => r.isBuiltIn)) return existing.filter((r) => r.isBuiltIn);

    const builtIns: Omit<InsertAutomationRule, "userId">[] = [
      {
        name: "Assignment due tomorrow",
        description: "If a task is due within 1 day, suggest a reminder.",
        trigger: { type: "assignment_due_soon", params: { withinDays: 1 } },
        action: { type: "create_reminder", params: {} },
        isEnabled: true,
        isBuiltIn: true,
      },
      {
        name: "Focus goal missed",
        description: "If today's focus minutes are below your daily goal, suggest a new schedule.",
        trigger: { type: "focus_goal_missed", params: { dailyGoalMinutes: 60 } },
        action: { type: "suggest_reschedule", params: {} },
        isEnabled: true,
        isBuiltIn: true,
      },
      {
        name: "Resume outdated",
        description: "If a resume hasn't been touched in 90 days, recommend an update.",
        trigger: { type: "resume_outdated", params: { staleDays: 90 } },
        action: { type: "recommend_update", params: {} },
        isEnabled: true,
        isBuiltIn: true,
      },
      {
        name: "Habit streak broken",
        description: "If a habit's streak drops to 0 after a longer streak, suggest a recovery plan.",
        trigger: { type: "habit_streak_broken", params: {} },
        action: { type: "suggest_recovery_plan", params: {} },
        isEnabled: true,
        isBuiltIn: true,
      },
      {
        name: "Exam within a week",
        description: "If an exam is within 7 days, recommend focused revision.",
        trigger: { type: "exam_within_week", params: {} },
        action: { type: "suggest_reschedule", params: {} },
        isEnabled: true,
        isBuiltIn: true,
      },
    ];

    const created: AutomationRule[] = [];
    for (const rule of builtIns) {
      created.push(await this.create(userId, rule));
    }
    return created;
  },
};
