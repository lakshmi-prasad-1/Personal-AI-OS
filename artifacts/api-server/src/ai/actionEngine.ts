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
import { studyProfileService } from "../services/studyProfileService";
import { subjectService } from "../services/subjectService";
import { flashcardService } from "../services/flashcardService";
import { quizService } from "../services/quizService";
import { revisionService } from "../services/revisionService";
import { teacherService } from "../services/teacherService";
import { studyAnalyticsService } from "../services/studyAnalyticsService";
import { careerProfileService } from "../services/careerProfileService";
import { skillService } from "../services/skillService";
import { projectService } from "../services/projectService";
import { careerGoalService } from "../services/careerGoalService";
import { resumeService } from "../services/resumeService";
import { interviewService } from "../services/interviewService";
import { careerAnalyticsService } from "../services/careerAnalyticsService";
import { applicationService } from "../services/applicationService";
import { companyService } from "../services/companyService";
import { jobAnalysisService } from "../services/jobAnalysisService";
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

// ─── Phase 2B: Study OS arg schemas ─────────────────────────────────────────
const updateStudyProfileArgs = z.object({
  semester: z.string().optional(),
  branch: z.string().optional(),
  dailyStudyGoalMinutes: z.number().int().optional(),
  preferredStudyTime: z.string().optional(),
  preferredLearningStyle: z.string().optional(),
  preferredRevisionStyle: z.string().optional(),
  weakSubjects: z.array(z.string()).optional(),
  strongSubjects: z.array(z.string()).optional(),
  programmingLanguages: z.array(z.string()).optional(),
  currentSkills: z.array(z.string()).optional(),
  targetSkills: z.array(z.string()).optional(),
});
const createSubjectArgs = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  semester: z.string().optional(),
  category: z.enum(["core", "elective", "lab", "project"]).optional().default("core"),
  examDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
});
const createTopicArgs = z.object({
  subjectName: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  importance: z.enum(["low", "medium", "high"]).optional().default("medium"),
  estimatedHours: z.number().int().optional(),
});
const updateTopicStatusArgs = z.object({ topicTitle: z.string().min(1), status: z.enum(["not_started", "in_progress", "completed", "revision_needed"]) });
const generateFlashcardsArgs = z.object({ topic: z.string().min(1), count: z.number().int().min(1).max(20).optional().default(5), type: z.enum(["definition", "concept", "formula", "programming", "revision"]).optional().default("concept") });
const generateQuizArgs = z.object({ topic: z.string().min(1), count: z.number().int().min(1).max(20).optional().default(5), difficulty: z.enum(["easy", "medium", "hard", "adaptive"]).optional().default("medium") });
const logStudySessionArgs = z.object({ subjectName: z.string().optional(), durationMinutes: z.number().int().min(1), type: z.enum(["study", "revision", "practice", "coding"]).optional().default("study"), notes: z.string().optional().default("") });
const explainTopicArgs = z.object({ topic: z.string().min(1), mode: z.enum(["simple", "deep", "examples", "interview", "coding", "exam", "step_by_step", "compare", "analogy", "default"]).optional().default("default") });

// ─── Phase 3A: Career OS arg schemas ─────────────────────────────────────────
const updateCareerProfileArgs = z.object({
  degree: z.string().optional(),
  university: z.string().optional(),
  currentSemester: z.string().optional(),
  graduationYear: z.string().optional(),
  preferredRoles: z.array(z.string()).optional(),
  preferredCompanies: z.array(z.string()).optional(),
  preferredLocations: z.array(z.string()).optional(),
  expectedSalary: z.string().optional(),
  preferredWorkTypes: z.array(z.string()).optional(),
  softSkills: z.array(z.string()).optional(),
  certificates: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
  githubUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  leetcodeUrl: z.string().optional(),
});
const addSkillArgs = z.object({
  name: z.string().min(1),
  category: z.enum(["programming_language", "framework", "library", "database", "cloud", "devops", "ai_ml", "dsa", "system_design", "soft_skill", "other"]).optional().default("other"),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional().default("beginner"),
  confidence: z.number().int().min(0).max(100).optional().default(50),
});
const addProjectArgs = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  techStack: z.array(z.string()).optional().default([]),
  githubUrl: z.string().optional(),
  demoUrl: z.string().optional(),
  status: z.enum(["planning", "in_progress", "completed", "archived"]).optional().default("in_progress"),
  role: z.string().optional().default(""),
});
const addCareerGoalArgs = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  type: z.enum(["short_term", "long_term"]).optional().default("short_term"),
  targetCompanies: z.array(z.string()).optional().default([]),
  targetRoles: z.array(z.string()).optional().default([]),
  targetTechnologies: z.array(z.string()).optional().default([]),
  targetDate: z.string().optional(),
});
const analyzeResumeArgs = z.object({ resumeTitle: z.string().min(1) });
const startMockInterviewArgs = z.object({ type: z.enum(["technical", "behavioral", "hr", "coding", "project_discussion", "resume_discussion"]) });
const analyzeJobDescriptionArgs = z.object({ jobDescription: z.string().min(1), company: z.string().optional().default(""), role: z.string().optional().default("") });
const trackApplicationArgs = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  status: z.enum(["applied", "screening", "interview", "assessment", "offer", "rejected", "withdrawn"]).optional().default("applied"),
  appliedDate: z.string().optional().default(""),
  deadline: z.string().optional(),
  jobUrl: z.string().optional(),
  notes: z.string().optional().default(""),
  salary: z.string().optional(),
  location: z.string().optional(),
  workType: z.enum(["remote", "hybrid", "onsite"]).optional(),
});
const addCompanyArgs = z.object({
  name: z.string().min(1),
  website: z.string().optional(),
  industry: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "dream"]).optional().default("medium"),
  notes: z.string().optional().default(""),
  status: z.enum(["researching", "applied", "interviewing", "offer", "rejected", "not_interested"]).optional().default("researching"),
});
const generateCareerRoadmapArgs = z.object({
  targetRole: z.string().min(1),
  currentLevel: z.enum(["beginner", "intermediate", "advanced"]).optional().default("beginner"),
  timelineMonths: z.number().int().min(1).max(24).optional().default(6),
});

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

        // ─── Study Profile & Subjects (Phase 2B) ────────────────────────────
        case "update_study_profile": {
          const args = updateStudyProfileArgs.parse(parsedArgs);
          const profile = await studyProfileService.upsert(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "update_study_profile", summary: "Updated study profile", payload: profile });
          return { toolCallId, toolName, ok: true, result: profile, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "create_subject": {
          const args = createSubjectArgs.parse(parsedArgs);
          const subject = await subjectService.create(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "create_subject", entityType: "subject", entityId: subject.id, summary: `Added subject "${subject.name}"`, payload: subject });
          return { toolCallId, toolName, ok: true, result: subject, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "list_subjects": {
          const subjects = await subjectService.list(userId);
          return { toolCallId, toolName, ok: true, result: subjects };
        }
        case "create_topic": {
          const args = createTopicArgs.parse(parsedArgs);
          const subject = await subjectService.findByName(userId, args.subjectName);
          if (!subject) return { toolCallId, toolName, ok: false, result: { error: `Subject "${args.subjectName}" not found. Create it first.` } };
          const topic = await subjectService.createTopic(userId, { subjectId: subject.id, title: args.title, description: args.description, difficulty: args.difficulty, importance: args.importance, estimatedHours: args.estimatedHours });
          const logged = await agentActionsService.log({ userId, chatId, actionType: "create_topic", entityType: "topic", entityId: topic.id, summary: `Added topic "${topic.title}" under ${subject.name}`, payload: topic });
          return { toolCallId, toolName, ok: true, result: topic, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "update_topic_status": {
          const args = updateTopicStatusArgs.parse(parsedArgs);
          const found = await subjectService.findTopicByTitle(userId, args.topicTitle);
          if (!found) return { toolCallId, toolName, ok: false, result: { error: `Topic "${args.topicTitle}" not found.` } };
          const topic = await subjectService.updateTopic(userId, found.id, { status: args.status });
          if (!topic) return { toolCallId, toolName, ok: false, result: { error: "Failed to update topic" } };
          const logged = await agentActionsService.log({ userId, chatId, actionType: "update_topic_status", entityType: "topic", entityId: topic.id, summary: `Marked topic "${topic.title}" as ${args.status}`, payload: topic });
          return { toolCallId, toolName, ok: true, result: topic, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }

        // ─── Flashcards ──────────────────────────────────────────────────────
        case "generate_flashcards": {
          const args = generateFlashcardsArgs.parse(parsedArgs);
          const generated = await flashcardService.generateWithAi(args);
          const cards = await flashcardService.createMany(userId, generated.map((c) => ({ ...c, source: "ai" as const })));
          const logged = await agentActionsService.log({ userId, chatId, actionType: "generate_flashcards", summary: `Generated ${cards.length} flashcards on "${args.topic}"`, payload: cards });
          return { toolCallId, toolName, ok: true, result: cards, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "list_flashcards_due": {
          const cards = await flashcardService.due(userId);
          return { toolCallId, toolName, ok: true, result: cards };
        }

        // ─── Quizzes ─────────────────────────────────────────────────────────
        case "generate_quiz": {
          const args = generateQuizArgs.parse(parsedArgs);
          const questions = await quizService.generateWithAi(args);
          const quiz = await quizService.create(userId, { title: `Quiz: ${args.topic}`, questions, difficulty: args.difficulty, source: "ai" });
          const logged = await agentActionsService.log({ userId, chatId, actionType: "generate_quiz", entityType: "quiz", entityId: quiz.id, summary: `Generated a ${questions.length}-question quiz on "${args.topic}"`, payload: quiz });
          return { toolCallId, toolName, ok: true, result: quiz, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }

        // ─── Revision & weak topics ──────────────────────────────────────────
        case "get_revision_recommendation": {
          const recommendation = await revisionService.recommendToday(userId);
          return { toolCallId, toolName, ok: true, result: recommendation };
        }
        case "get_weak_topics": {
          const weakTopics = await revisionService.listWeakTopics(userId);
          return { toolCallId, toolName, ok: true, result: weakTopics };
        }
        case "log_study_session": {
          const args = logStudySessionArgs.parse(parsedArgs);
          let subjectId: string | undefined;
          if (args.subjectName) {
            const subject = await subjectService.findByName(userId, args.subjectName);
            subjectId = subject?.id;
          }
          const date = new Date().toISOString().slice(0, 10);
          const session = await studyAnalyticsService.logSession(userId, { subjectId, durationMinutes: args.durationMinutes, type: args.type, notes: args.notes, date });
          const logged = await agentActionsService.log({ userId, chatId, actionType: "log_study_session", summary: `Logged ${args.durationMinutes}min ${args.type} session${args.subjectName ? ` for ${args.subjectName}` : ""}`, payload: session });
          return { toolCallId, toolName, ok: true, result: session, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }

        // ─── AI Teacher ──────────────────────────────────────────────────────
        case "explain_topic": {
          const args = explainTopicArgs.parse(parsedArgs);
          const explanation = await teacherService.explain(args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "explain_topic", summary: `Explained "${args.topic}" (${args.mode} mode)`, payload: { topic: args.topic, mode: args.mode } });
          return { toolCallId, toolName, ok: true, result: { explanation }, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }

        // ─── Study recommendation ────────────────────────────────────────────
        case "get_study_recommendation": {
          const decisions = await decisionEngine.decide(userId);
          const studyDecisions = decisions.filter((d) => d.actionType.startsWith("study_") || d.actionType.includes("revis") || d.actionType.includes("weak") || d.actionType.includes("subject") || d.actionType.includes("flashcard") || d.actionType.includes("quiz"));
          return { toolCallId, toolName, ok: true, result: studyDecisions.length ? studyDecisions : decisions };
        }

        // ─── Career Profile (Phase 3A) ────────────────────────────────────────
        case "update_career_profile": {
          const args = updateCareerProfileArgs.parse(parsedArgs);
          const profile = await careerProfileService.upsert(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "update_career_profile", summary: "Updated career profile", payload: profile });
          return { toolCallId, toolName, ok: true, result: profile, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "add_skill": {
          const args = addSkillArgs.parse(parsedArgs);
          const existing = await skillService.findByName(userId, args.name);
          const skill = existing ? await skillService.update(userId, existing.id, args) : await skillService.create(userId, args);
          if (!skill) return { toolCallId, toolName, ok: false, result: { error: "Failed to save skill" } };
          const logged = await agentActionsService.log({ userId, chatId, actionType: "add_skill", entityType: "skill", entityId: skill.id, summary: `${existing ? "Updated" : "Added"} skill "${skill.name}"`, payload: skill });
          return { toolCallId, toolName, ok: true, result: skill, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "add_project": {
          const args = addProjectArgs.parse(parsedArgs);
          const project = await projectService.create(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "add_project", entityType: "project", entityId: project.id, summary: `Added project "${project.title}"`, payload: project });
          return { toolCallId, toolName, ok: true, result: project, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "add_career_goal": {
          const args = addCareerGoalArgs.parse(parsedArgs);
          const goal = await careerGoalService.create(userId, args);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "add_career_goal", entityType: "career_goal", entityId: goal.id, summary: `Added career goal "${goal.title}"`, payload: goal });
          return { toolCallId, toolName, ok: true, result: goal, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "analyze_resume": {
          const args = analyzeResumeArgs.parse(parsedArgs);
          const resumes = await resumeService.list(userId);
          const found = resumes.find((r) => r.title.toLowerCase().includes(args.resumeTitle.toLowerCase()));
          if (!found) return { toolCallId, toolName, ok: false, result: { error: `Resume "${args.resumeTitle}" not found.` } };
          const analyzed = await resumeService.analyze(userId, found.id);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "analyze_resume", entityType: "resume", entityId: found.id, summary: `Analyzed resume "${found.title}"`, payload: analyzed });
          return { toolCallId, toolName, ok: true, result: analyzed, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "get_career_recommendation": {
          const tips = await careerAnalyticsService.recommendation(userId);
          await agentActionsService.log({ userId, chatId, actionType: "get_career_recommendation", summary: `Generated ${tips.length} career recommendation(s)`, payload: tips });
          return { toolCallId, toolName, ok: true, result: tips };
        }
        case "show_career_progress": {
          const overview = await careerAnalyticsService.overview(userId);
          return { toolCallId, toolName, ok: true, result: overview };
        }
        case "start_mock_interview": {
          const args = startMockInterviewArgs.parse(parsedArgs);
          const question = await interviewService.generateQuestion(args.type);
          const logged = await agentActionsService.log({ userId, chatId, actionType: "start_mock_interview", summary: `Started a ${args.type} mock interview`, payload: { type: args.type, question } });
          return { toolCallId, toolName, ok: true, result: { type: args.type, question }, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }

        // ─── Career OS extended (Phase 3A continued) ─────────────────────────
        case "analyze_job_description": {
          const args = analyzeJobDescriptionArgs.parse(parsedArgs);
          const analysis = await jobAnalysisService.analyzeJobDescription(userId, args.jobDescription, args.company, args.role);
          await agentActionsService.log({ userId, chatId, actionType: "analyze_job_description", summary: `Analyzed JD for "${analysis.role}" at "${analysis.company}" — ${analysis.matchPercent}% match`, payload: analysis });
          return { toolCallId, toolName, ok: true, result: analysis };
        }
        case "track_application": {
          const args = trackApplicationArgs.parse(parsedArgs);
          const app = await applicationService.create(userId, { ...args, appliedDate: args.appliedDate || new Date().toISOString().slice(0, 10), timeline: [] });
          const logged = await agentActionsService.log({ userId, chatId, actionType: "track_application", entityType: "job_application", entityId: app.id, summary: `Tracked application: ${args.role} at ${args.company}`, payload: app });
          return { toolCallId, toolName, ok: true, result: app, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "add_company": {
          const args = addCompanyArgs.parse(parsedArgs);
          const existing = await companyService.findByName(userId, args.name);
          const company = existing ? await companyService.update(userId, existing.id, args) : await companyService.create(userId, args);
          if (!company) return { toolCallId, toolName, ok: false, result: { error: "Failed to save company" } };
          const logged = await agentActionsService.log({ userId, chatId, actionType: "add_company", entityType: "company", entityId: company.id, summary: `${existing ? "Updated" : "Added"} company "${company.name}"`, payload: company });
          return { toolCallId, toolName, ok: true, result: company, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "generate_career_roadmap": {
          const args = generateCareerRoadmapArgs.parse(parsedArgs);
          const roadmap = await jobAnalysisService.generateRoadmap(userId, args.targetRole, args.currentLevel, args.timelineMonths);
          await agentActionsService.log({ userId, chatId, actionType: "generate_career_roadmap", summary: `Generated ${args.timelineMonths}-month roadmap for "${args.targetRole}"`, payload: roadmap });
          return { toolCallId, toolName, ok: true, result: roadmap };
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
