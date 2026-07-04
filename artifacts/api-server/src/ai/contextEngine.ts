import { notesService } from "../services/notesService";
import { ideasService } from "../services/ideasService";
import { memoriesService } from "../services/memoriesService";
import { resourcesService } from "../services/resourcesService";
import { taskService } from "../services/taskService";
import { goalService } from "../services/goalService";
import { habitService } from "../services/habitService";
import { focusService } from "../services/focusService";
import { reminderService } from "../services/reminderService";
import { subjectService } from "../services/subjectService";
import { flashcardService } from "../services/flashcardService";
import { revisionService } from "../services/revisionService";
import { careerProfileService } from "../services/careerProfileService";
import { skillService } from "../services/skillService";
import { careerGoalService } from "../services/careerGoalService";
import { interviewService } from "../services/interviewService";

export interface AssembledContext {
  pinnedNotes: { title: string; content: string }[];
  recentIdeas: { title: string; status: string }[];
  memories: { title: string; description: string; importanceScore: number }[];
  recentResources: { title: string; category: string }[];
  // Phase 2A additions
  todayTasks: { title: string; priority: string; status: string; dueDate: string | null }[];
  activeGoals: { title: string; progressPercent: number; category: string }[];
  habits: { name: string; completedToday: boolean; streak: number }[];
  upcomingReminders: { title: string; remindAt: string }[];
  activeFocusSession: { title: string; type: string; plannedMinutes: number } | null;
  // Phase 2B additions
  subjects: { name: string; progressPercent: number; priority: string; examDate: string | null }[];
  dueFlashcardsCount: number;
  weakTopics: { reason: string; weaknessScore: number }[];
  // Phase 3A additions
  careerProfile: { preferredRoles: string[]; preferredCompanies: string[]; degree: string | null } | null;
  topSkills: { name: string; level: string; confidence: number }[];
  activeCareerGoals: { title: string; type: string; progressPercent: number }[];
  interviewReadinessPercent: number;
  summary: string;
}

function recencyLabel(date: Date): string {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo <= 7) return "this week";
  if (daysAgo <= 14) return "last week";
  return "a while ago";
}

/**
 * The Context Engine gathers both knowledge-base and productivity data for
 * the AI prompt. Phase 2A extends it to include today's tasks, active goals,
 * habit status, upcoming reminders, and any active focus session — so the AI
 * can give genuinely useful answers to "what should I do today?" and similar.
 */
export const contextEngine = {
  async gather(userId: string): Promise<AssembledContext> {
    const [
      allNotes, allIdeas, allMemories, allResources,
      todayTasks, activeGoals, habitStatus, upcomingReminders, activeFocus,
      subjects, dueFlashcards, weakTopics,
      careerProfile, skills, careerGoals, interviewStats,
    ] = await Promise.all([
      notesService.list(userId),
      ideasService.list(userId),
      memoriesService.list(userId),
      resourcesService.list(userId),
      taskService.listDueToday(userId),
      goalService.list(userId),
      habitService.getTodayStatus(userId),
      reminderService.upcoming(userId, 3),
      focusService.getActive(userId),
      subjectService.list(userId),
      flashcardService.due(userId, 100),
      revisionService.listWeakTopics(userId),
      careerProfileService.getOrCreate(userId),
      skillService.list(userId),
      careerGoalService.list(userId),
      interviewService.stats(userId),
    ]);

    const pinnedNotes = allNotes.slice(0, 5);
    const recentIdeas = allIdeas.slice(0, 5);
    const memories = allMemories.slice(0, 8);
    const recentResources = allResources.slice(0, 5);
    const goals = activeGoals.filter((g) => g.status === "active").slice(0, 5);

    const context: AssembledContext = {
      pinnedNotes: pinnedNotes.map((n) => ({ title: n.title, content: n.content.slice(0, 200) })),
      recentIdeas: recentIdeas.map((i) => ({ title: i.title, status: i.status })),
      memories: memories.map((m) => ({ title: m.title, description: m.description.slice(0, 160), importanceScore: m.importanceScore })),
      recentResources: recentResources.map((r) => ({ title: r.title, category: r.category })),
      todayTasks: todayTasks.slice(0, 10).map((t) => ({ title: t.title, priority: t.priority, status: t.status, dueDate: t.dueDate ?? null })),
      activeGoals: goals.map((g) => ({ title: g.title, progressPercent: g.progressPercent, category: g.category })),
      habits: habitStatus.map((h) => ({ name: h.habit.name, completedToday: h.completedToday, streak: h.habit.currentStreak })),
      upcomingReminders: upcomingReminders.map((r) => ({ title: r.title, remindAt: r.remindAt.toString() })),
      activeFocusSession: activeFocus ? { title: activeFocus.title, type: activeFocus.type, plannedMinutes: activeFocus.plannedMinutes } : null,
      subjects: subjects.slice(0, 8).map((s) => ({ name: s.name, progressPercent: s.progressPercent, priority: s.priority, examDate: s.examDate ?? null })),
      dueFlashcardsCount: dueFlashcards.length,
      weakTopics: weakTopics.slice(0, 5).map((w) => ({ reason: w.reason, weaknessScore: w.weaknessScore })),
      careerProfile:
        careerProfile.preferredRoles.length || careerProfile.preferredCompanies.length || careerProfile.degree
          ? { preferredRoles: careerProfile.preferredRoles, preferredCompanies: careerProfile.preferredCompanies, degree: careerProfile.degree }
          : null,
      topSkills: skills.sort((a, b) => b.confidence - a.confidence).slice(0, 8).map((s) => ({ name: s.name, level: s.level, confidence: s.confidence })),
      activeCareerGoals: careerGoals.filter((g) => g.status === "active").slice(0, 5).map((g) => ({ title: g.title, type: g.type, progressPercent: g.progressPercent })),
      interviewReadinessPercent: interviewStats.readinessPercent,
      summary: "",
    };

    const parts: string[] = [];

    if (context.memories.length) {
      parts.push(`Known facts about the user: ${context.memories.map((m) => `${m.title} (${m.description})`).join("; ")}.`);
    }
    if (context.todayTasks.length) {
      const pending = context.todayTasks.filter((t) => t.status !== "done");
      const done = context.todayTasks.filter((t) => t.status === "done");
      if (pending.length) parts.push(`Tasks due today (${pending.length} pending): ${pending.map((t) => `"${t.title}" [${t.priority}]`).join(", ")}.`);
      if (done.length) parts.push(`Tasks completed today: ${done.map((t) => `"${t.title}"`).join(", ")}.`);
    }
    if (context.activeGoals.length) {
      parts.push(`Active goals: ${context.activeGoals.map((g) => `"${g.title}" (${g.progressPercent}% done)`).join(", ")}.`);
    }
    if (context.habits.length) {
      const done = context.habits.filter((h) => h.completedToday);
      const pending = context.habits.filter((h) => !h.completedToday);
      if (done.length) parts.push(`Habits completed today: ${done.map((h) => h.name).join(", ")}.`);
      if (pending.length) parts.push(`Habits still pending today: ${pending.map((h) => `${h.name} (${h.streak}d streak)`).join(", ")}.`);
    }
    if (context.activeFocusSession) {
      parts.push(`User is currently in a ${context.activeFocusSession.type} session: "${context.activeFocusSession.title}" (${context.activeFocusSession.plannedMinutes}min).`);
    }
    if (context.upcomingReminders.length) {
      parts.push(`Upcoming reminders: ${context.upcomingReminders.map((r) => `"${r.title}"`).join(", ")}.`);
    }
    if (pinnedNotes.length) {
      parts.push(`Recent notes: ${pinnedNotes.map((n) => `${n.title} (${recencyLabel(new Date(n.createdAt))})`).join(", ")}.`);
    }
    if (recentIdeas.length) {
      parts.push(`Recent ideas: ${recentIdeas.map((i) => `${i.title} [${i.status}]`).join(", ")}.`);
    }
    if (context.subjects.length) {
      parts.push(`Subjects being studied: ${context.subjects.map((s) => `${s.name} (${s.progressPercent}% done${s.examDate ? `, exam ${s.examDate}` : ""})`).join(", ")}.`);
    }
    if (context.dueFlashcardsCount > 0) {
      parts.push(`${context.dueFlashcardsCount} flashcard(s) are due for revision today.`);
    }
    if (context.weakTopics.length) {
      parts.push(`Weak topics flagged: ${context.weakTopics.map((w) => w.reason).filter(Boolean).join(", ") || `${context.weakTopics.length} topic(s) need extra attention`}.`);
    }
    if (context.careerProfile) {
      parts.push(`Career profile: interested in ${context.careerProfile.preferredRoles.join(", ") || "unspecified roles"}${context.careerProfile.preferredCompanies.length ? ` at companies like ${context.careerProfile.preferredCompanies.join(", ")}` : ""}${context.careerProfile.degree ? ` (${context.careerProfile.degree})` : ""}.`);
    }
    if (context.topSkills.length) {
      parts.push(`Top skills: ${context.topSkills.map((s) => `${s.name} (${s.level}, ${s.confidence}% confidence)`).join(", ")}.`);
    }
    if (context.activeCareerGoals.length) {
      parts.push(`Active career goals: ${context.activeCareerGoals.map((g) => `"${g.title}" (${g.progressPercent}% done)`).join(", ")}.`);
    }
    if (context.interviewReadinessPercent > 0) {
      parts.push(`Interview readiness: ${context.interviewReadinessPercent}% of interview topics mastered.`);
    }

    context.summary = parts.length
      ? `${parts.join(" ")} When answering, refer to today's tasks/habits/goals proactively. Use natural recency language (today, yesterday, this week). Continue prior conversations rather than treating every message as brand new.`
      : "";

    return context;
  },
};
