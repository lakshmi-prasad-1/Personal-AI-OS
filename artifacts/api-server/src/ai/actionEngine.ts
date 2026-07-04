import { z } from "zod/v4";
import { notesService } from "../services/notesService";
import { ideasService } from "../services/ideasService";
import { memoriesService } from "../services/memoriesService";
import { resourcesService } from "../services/resourcesService";
import { agentActionsService } from "../services/agentActionsService";
import { searchService } from "../services/searchService";
import { decisionEngine } from "./decisionEngine";
import { taskService } from "../services/taskService";
import { goalService } from "../services/goalService";
import { habitService } from "../services/habitService";
import { focusService } from "../services/focusService";
import { reminderService } from "../services/reminderService";
import { plannerService } from "../services/plannerService";
import { reviewService } from "../services/reviewService";
import { logger } from "../lib/logger";

// ─── Phase 1 arg schemas ────────────────────────────────────────────────────
const createNoteArgs = z.object({ title: z.string().min(1), content: z.string().optional().default(""), tags: z.array(z.string()).optional().default([]) });
const createIdeaArgs = z.object({ title: z.string().min(1), content: z.string().optional().default(""), category: z.string().optional(), priority: z.enum(["low", "medium", "high"]).optional().default("medium"), tags: z.array(z.string()).optional().default([]) });
const createMemoryArgs = z.object({ title: z.string().min(1), description: z.string().min(1), category: z.string().optional().default("general"), importanceScore: z.number().int().min(0).max(100).optional().default(70), tags: z.array(z.string()).optional().default([]) });
const createResourceArgs = z.object({ title: z.string().min(1), description: z.string().optional(), category: z.string().optional().default("document") });
const searchArgs = z.object({ query: z.string().min(1) });

// ─── Phase 2A arg schemas ───────────────────────────────────────────────────
const createTaskArgs = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  category: z.string().optional().default("general"),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  estimatedMinutes: z.number().int().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  tags: z.array(z.string()).optional().default([]),
});

const completeTaskArgs = z.object({ taskId: z.string().optional(), taskTitle: z.string().optional() });
const listTasksArgs = z.object({ filter: z.enum(["all", "today", "upcoming", "done"]).optional().default("all"), status: z.string().optional(), priority: z.string().optional() });
const updateTaskArgs = z.object({ taskId: z.string().optional(), taskTitle: z.string().optional(), updates: z.object({ priority: z.string().optional(), status: z.string().optional(), dueDate: z.string().optional(), description: z.string().optional() }).optional().default({}) });

const createGoalArgs = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  category: z.string().optional().default("personal"),
  type: z.enum(["short_term", "long_term"]).optional().default("long_term"),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  targetDate: z.string().optional(),
});

const updateGoalProgressArgs = z.object({ goalTitle: z.string().min(1), progressPercent: z.number().int().min(0).max(100).optional(), completed: z.boolean().optional() });

const createHabitArgs = z.object({ name: z.string().min(1), description: z.string().optional().default(""), category: z.string().optional().default("general"), frequency: z.enum(["daily", "weekly", "monthly"]).optional().default("daily") });
const logHabitArgs = z.object({ habitName: z.string().min(1), completed: z.boolean().optional().default(true) });

const createReminderArgs = z.object({ title: z.string().min(1), body: z.string().optional().default(""), remindAt: z.string().min(1), isRecurring: z.boolean().optional().default(false), recurringPattern: z.enum(["daily", "weekly", "monthly"]).optional() });

const planDayArgs = z.object({
  date: z.string().optional(),
  events: z.array(z.object({
    title: z.string(),
    type: z.enum(["study", "project", "coding", "college", "break", "free", "buffer", "custom"]).optional().default("custom"),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    durationMinutes: z.number().int().optional(),
  })),
});

const startFocusArgs = z.object({ title: z.string().min(1), type: z.enum(["pomodoro", "deep_work", "study", "coding"]).optional().default("pomodoro"), plannedMinutes: z.number().int().optional().default(25) });
const stopFocusArgs = z.object({ notes: z.string().optional() });
const generateDailyReviewArgs = z.object({ date: z.string().optional() });

export interface ActionResult {
  toolCallId: string;
  toolName: string;
  ok: boolean;
  result: unknown;
  actionLogged?: { actionType: string; summary: string };
}

/** Helper: find a task by title for tools that reference tasks by name */
async function findTaskByTitle(userId: string, title: string) {
  const tasks = await taskService.list(userId);
  return tasks.find((t) => t.title.toLowerCase().includes(title.toLowerCase()));
}

/** Helper: find a goal by title */
async function findGoalByTitle(userId: string, title: string) {
  const goals = await goalService.list(userId);
  return goals.find((g) => g.title.toLowerCase().includes(title.toLowerCase()));
}

/** Helper: find a habit by name */
async function findHabitByName(userId: string, name: string) {
  const habits = await habitService.list(userId);
  return habits.find((h) => h.name.toLowerCase().includes(name.toLowerCase()));
}

/**
 * The Action Engine is the ONLY place tool calls turn into database writes.
 * Every write is Zod-validated before touching a service, every write is
 * scoped to the authenticated user, and every write is logged to
 * agent_actions so it shows up in the Activity Timeline.
 */
export const actionEngine = {
  async execute(params: {
    userId: string;
    chatId: string;
    toolCallId: string;
    toolName: string;
    rawArgs: string;
  }): Promise<ActionResult> {
    const { userId, chatId, toolCallId, toolName, rawArgs } = params;

    let parsedArgs: unknown;
    try {
      parsedArgs = rawArgs ? JSON.parse(rawArgs) : {};
    } catch {
      return { toolCallId, toolName, ok: false, result: { error: "Malformed tool arguments." } };
    }

    try {
      switch (toolName) {
        // ─── Phase 1 ──────────────────────────────────────────────────────
        case "create_note": {
          const args = createNoteArgs.parse(parsedArgs);
          const note = await notesService.create(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "create_note", entityType: "note", entityId: note.id, summary: `Created note "${note.title}"`, payload: note });
          return { toolCallId, toolName, ok: true, result: note, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "create_idea": {
          const args = createIdeaArgs.parse(parsedArgs);
          const idea = await ideasService.create(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "create_idea", entityType: "idea", entityId: idea.id, summary: `Created idea "${idea.title}"`, payload: idea });
          return { toolCallId, toolName, ok: true, result: idea, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "create_memory": {
          const args = createMemoryArgs.parse(parsedArgs);
          const memory = await memoriesService.create(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "create_memory", entityType: "memory", entityId: memory.id, summary: `Stored memory "${memory.title}"`, payload: memory });
          return { toolCallId, toolName, ok: true, result: memory, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "create_resource": {
          const args = createResourceArgs.parse(parsedArgs);
          const resource = await resourcesService.create(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "create_resource", entityType: "resource", entityId: resource.id, summary: `Saved resource "${resource.title}"`, payload: resource });
          return { toolCallId, toolName, ok: true, result: resource, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "search_knowledge": {
          const args = searchArgs.parse(parsedArgs);
          const results = await searchService.search(userId, args.query, 10);
          await agentActionsService.log({ userId, chatId, actionType: "search", summary: `Searched for "${args.query}" (${results.length} results)`, payload: { query: args.query, resultCount: results.length } });
          return { toolCallId, toolName, ok: true, result: results };
        }
        case "get_recommendations": {
          const decisions = await decisionEngine.decide(userId);
          await agentActionsService.log({ userId, chatId, actionType: "get_recommendations", summary: `Generated ${decisions.length} recommendation(s)`, payload: decisions });
          return { toolCallId, toolName, ok: true, result: decisions };
        }

        // ─── Tasks ────────────────────────────────────────────────────────
        case "create_task": {
          const args = createTaskArgs.parse(parsedArgs);
          const task = await taskService.create(userId, { ...args, createdByAi: true });
          const logged = await agentActionsService.log({ userId, chatId, actionType: "create_task", entityType: "task", entityId: task.id, summary: `Created task "${task.title}"${task.dueDate ? ` (due ${task.dueDate})` : ""}`, payload: task });
          return { toolCallId, toolName, ok: true, result: task, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "complete_task": {
          const args = completeTaskArgs.parse(parsedArgs);
          let task;
          if (args.taskId) {
            task = await taskService.complete(userId, args.taskId);
          } else if (args.taskTitle) {
            const found = await findTaskByTitle(userId, args.taskTitle);
            if (found) task = await taskService.complete(userId, found.id);
          }
          if (!task) return { toolCallId, toolName, ok: false, result: { error: "Task not found" } };
          const logged = await agentActionsService.log({ userId, chatId, actionType: "complete_task", entityType: "task", entityId: task.id, summary: `Completed task "${task.title}"`, payload: task });
          return { toolCallId, toolName, ok: true, result: task, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "list_tasks": {
          const args = listTasksArgs.parse(parsedArgs);
          let tasks;
          if (args.filter === "today") tasks = await taskService.listDueToday(userId);
          else if (args.filter === "upcoming") tasks = await taskService.listUpcoming(userId);
          else if (args.filter === "done") tasks = await taskService.list(userId, { status: "done" });
          else tasks = await taskService.list(userId, { status: args.status, priority: args.priority });
          return { toolCallId, toolName, ok: true, result: tasks };
        }
        case "update_task": {
          const args = updateTaskArgs.parse(parsedArgs);
          let task;
          const id = args.taskId ?? (args.taskTitle ? (await findTaskByTitle(userId, args.taskTitle))?.id : undefined);
          if (id) task = await taskService.update(userId, id, args.updates);
          if (!task) return { toolCallId, toolName, ok: false, result: { error: "Task not found" } };
          const logged = await agentActionsService.log({ userId, chatId, actionType: "update_task", entityType: "task", entityId: task.id, summary: `Updated task "${task.title}"`, payload: task });
          return { toolCallId, toolName, ok: true, result: task, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }

        // ─── Goals ────────────────────────────────────────────────────────
        case "create_goal": {
          const args = createGoalArgs.parse(parsedArgs);
          const goal = await goalService.create(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "create_goal", entityType: "goal", entityId: goal.id, summary: `Created goal "${goal.title}"`, payload: goal });
          return { toolCallId, toolName, ok: true, result: goal, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "update_goal_progress": {
          const args = updateGoalProgressArgs.parse(parsedArgs);
          const found = await findGoalByTitle(userId, args.goalTitle);
          if (!found) return { toolCallId, toolName, ok: false, result: { error: "Goal not found" } };
          let goal;
          if (args.completed) {
            goal = await goalService.complete(userId, found.id);
          } else if (args.progressPercent !== undefined) {
            goal = await goalService.updateProgress(userId, found.id, args.progressPercent);
          }
          if (!goal) return { toolCallId, toolName, ok: false, result: { error: "Failed to update goal" } };
          const logged = await agentActionsService.log({ userId, chatId, actionType: "update_goal", entityType: "goal", entityId: goal.id, summary: `Updated goal "${goal.title}" to ${goal.progressPercent}%`, payload: goal });
          return { toolCallId, toolName, ok: true, result: goal, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }

        // ─── Habits ───────────────────────────────────────────────────────
        case "create_habit": {
          const args = createHabitArgs.parse(parsedArgs);
          const habit = await habitService.create(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "create_habit", entityType: "habit", entityId: habit.id, summary: `Created habit "${habit.name}"`, payload: habit });
          return { toolCallId, toolName, ok: true, result: habit, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "log_habit": {
          const args = logHabitArgs.parse(parsedArgs);
          const found = await findHabitByName(userId, args.habitName);
          if (!found) return { toolCallId, toolName, ok: false, result: { error: `Habit "${args.habitName}" not found. Create it first.` } };
          const log = await habitService.logToday(userId, found.id, args.completed);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "log_habit", entityType: "habit", entityId: found.id, summary: `Logged habit "${found.name}" as ${args.completed ? "completed" : "skipped"} today`, payload: log });
          return { toolCallId, toolName, ok: true, result: { habit: found, log }, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }

        // ─── Reminders ────────────────────────────────────────────────────
        case "create_reminder": {
          const args = createReminderArgs.parse(parsedArgs);
          const reminder = await reminderService.create(userId, {
            ...args,
            remindAt: new Date(args.remindAt),
            createdByAi: true,
          });
          const logged = await agentActionsService.log({ userId, chatId, actionType: "create_reminder", entityType: "reminder", entityId: reminder.id, summary: `Created reminder "${reminder.title}" for ${args.remindAt}`, payload: reminder });
          return { toolCallId, toolName, ok: true, result: reminder, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }

        // ─── Planner ──────────────────────────────────────────────────────
        case "plan_day": {
          const args = planDayArgs.parse(parsedArgs);
          const date = args.date ?? new Date().toISOString().slice(0, 10);
          const created = [];
          for (const ev of args.events) {
            const event = await plannerService.create(userId, { ...ev, date, createdByAi: true });
            created.push(event);
          }
          await agentActionsService.log({ userId, chatId, actionType: "plan_day", summary: `Planned ${created.length} events for ${date}`, payload: { date, events: created } });
          return { toolCallId, toolName, ok: true, result: { date, events: created } };
        }

        // ─── Focus ────────────────────────────────────────────────────────
        case "start_focus_session": {
          const args = startFocusArgs.parse(parsedArgs);
          const session = await focusService.create(userId, { title: args.title, type: args.type, plannedMinutes: args.plannedMinutes });
          const started = await focusService.start(userId, session.id);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "focus_start", entityType: "focus_session", entityId: session.id, summary: `Started ${args.type} session: "${args.title}" (${args.plannedMinutes}min)`, payload: started });
          return { toolCallId, toolName, ok: true, result: started, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "stop_focus_session": {
          const args = stopFocusArgs.parse(parsedArgs);
          const active = await focusService.getActive(userId);
          if (!active) return { toolCallId, toolName, ok: false, result: { error: "No active focus session to stop." } };
          const stopped = await focusService.stop(userId, active.id, args.notes);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "focus_complete", entityType: "focus_session", entityId: active.id, summary: `Completed ${stopped?.actualMinutes ?? 0}min focus session: "${active.title}"`, payload: stopped });
          return { toolCallId, toolName, ok: true, result: stopped, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }

        // ─── Reviews ──────────────────────────────────────────────────────
        case "generate_daily_review": {
          const args = generateDailyReviewArgs.parse(parsedArgs);
          const date = args.date ?? new Date().toISOString().slice(0, 10);
          const review = await reviewService.generateDailyReview(userId, date);
          await agentActionsService.log({ userId, chatId, actionType: "daily_review", summary: `Generated daily review for ${date}`, payload: review });
          return { toolCallId, toolName, ok: true, result: review };
        }
        case "generate_weekly_review": {
          const review = await reviewService.generateWeeklyReview(userId);
          await agentActionsService.log({ userId, chatId, actionType: "weekly_review", summary: `Generated weekly review`, payload: review });
          return { toolCallId, toolName, ok: true, result: review };
        }

        // ─── Productivity summary ─────────────────────────────────────────
        case "get_productivity_summary": {
          const [todayTasks, upcomingTasks, taskStats, habitStatus, goalStats, reminders, focusStats] = await Promise.all([
            taskService.listDueToday(userId),
            taskService.listUpcoming(userId),
            taskService.stats(userId),
            habitService.getTodayStatus(userId),
            goalService.stats(userId),
            reminderService.upcoming(userId, 3),
            focusService.todayStats(userId),
          ]);
          const summary = {
            today: { tasks: todayTasks, focusMinutes: focusStats.totalMinutes, focusSessions: focusStats.sessions },
            habits: habitStatus,
            goals: goalStats,
            upcomingTasks: upcomingTasks.slice(0, 5),
            reminders,
            taskStats,
          };
          await agentActionsService.log({ userId, chatId, actionType: "productivity_summary", summary: "Retrieved productivity summary", payload: summary });
          return { toolCallId, toolName, ok: true, result: summary };
        }

        default:
          return { toolCallId, toolName, ok: false, result: { error: `Unknown tool ${toolName}` } };
      }
    } catch (err) {
      logger.error({ err, toolName }, "Action engine failed to execute tool call");
      await agentActionsService.log({ userId, chatId, actionType: toolName, summary: `Failed to execute ${toolName}`, status: "failed", payload: { error: err instanceof Error ? err.message : String(err) } }).catch(() => undefined);
      return { toolCallId, toolName, ok: false, result: { error: err instanceof Error ? err.message : "Action failed validation." } };
    }
  },
};
