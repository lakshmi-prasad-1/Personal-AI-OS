import { and, eq, gte, lte } from "drizzle-orm";
import {
  db,
  tasksTable,
  goalsTable,
  habitLogsTable,
  focusSessionsTable,
  remindersTable,
  plannerEventsTable,
  notesTable,
  ideasTable,
  memoriesTable,
  resourcesTable,
  agentActionsTable,
} from "@workspace/db";

export interface TimelineEntry {
  id: string;
  type:
    | "task_completed"
    | "goal_completed"
    | "habit_logged"
    | "focus_session"
    | "reminder_completed"
    | "planner_event"
    | "note"
    | "idea"
    | "memory"
    | "resource"
    | "agent_action";
  title: string;
  timestamp: string;
  detail?: string;
}

/**
 * Phase 4, Module 2: Life Timeline. Aggregates events across every existing
 * module into one chronological feed — no new "events" table, it reads
 * straight from each service's own table so nothing can drift out of sync.
 */
export const timelineService = {
  async range(userId: string, from: Date, to: Date): Promise<TimelineEntry[]> {
    const entries: TimelineEntry[] = [];

    const [tasks, goals, habitLogs, focusSessions, reminders, plannerEvents, notes, ideas, memories, resources, actions] =
      await Promise.all([
        db.select().from(tasksTable).where(eq(tasksTable.userId, userId)),
        db.select().from(goalsTable).where(eq(goalsTable.userId, userId)),
        db.select().from(habitLogsTable).where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.completed, true))),
        db.select().from(focusSessionsTable).where(eq(focusSessionsTable.userId, userId)),
        db.select().from(remindersTable).where(eq(remindersTable.userId, userId)),
        db.select().from(plannerEventsTable).where(eq(plannerEventsTable.userId, userId)),
        db.select().from(notesTable).where(eq(notesTable.userId, userId)),
        db.select().from(ideasTable).where(eq(ideasTable.userId, userId)),
        db.select().from(memoriesTable).where(eq(memoriesTable.userId, userId)),
        db.select().from(resourcesTable).where(eq(resourcesTable.userId, userId)),
        db.select().from(agentActionsTable).where(eq(agentActionsTable.userId, userId)),
      ]);

    const inRange = (d: Date) => d >= from && d <= to;

    for (const t of tasks) {
      if (t.completedAt && inRange(new Date(t.completedAt))) {
        entries.push({ id: t.id, type: "task_completed", title: `Completed task: ${t.title}`, timestamp: new Date(t.completedAt).toISOString() });
      }
    }
    for (const g of goals) {
      if (g.status === "completed" && inRange(new Date(g.updatedAt))) {
        entries.push({ id: g.id, type: "goal_completed", title: `Completed goal: ${g.title}`, timestamp: new Date(g.updatedAt).toISOString() });
      }
    }
    for (const h of habitLogs) {
      const d = new Date(h.date);
      if (inRange(d)) {
        entries.push({ id: h.id, type: "habit_logged", title: "Habit completed", timestamp: d.toISOString(), detail: h.notes || undefined });
      }
    }
    for (const f of focusSessions) {
      if (f.completedAt && inRange(new Date(f.completedAt))) {
        entries.push({ id: f.id, type: "focus_session", title: `Focus session: ${f.actualMinutes ?? 0} min`, timestamp: new Date(f.completedAt).toISOString() });
      }
    }
    for (const r of reminders) {
      if (r.completedAt && inRange(new Date(r.completedAt))) {
        entries.push({ id: r.id, type: "reminder_completed", title: `Reminder done: ${r.title}`, timestamp: new Date(r.completedAt).toISOString() });
      }
    }
    for (const p of plannerEvents) {
      const d = new Date(`${p.date}T${p.startTime || "00:00"}`);
      if (inRange(d)) {
        entries.push({ id: p.id, type: "planner_event", title: p.title, timestamp: d.toISOString(), detail: p.isCompleted ? "completed" : undefined });
      }
    }
    for (const n of notes) {
      if (inRange(new Date(n.createdAt))) entries.push({ id: n.id, type: "note", title: `Note: ${n.title}`, timestamp: new Date(n.createdAt).toISOString() });
    }
    for (const i of ideas) {
      if (inRange(new Date(i.createdAt))) entries.push({ id: i.id, type: "idea", title: `Idea: ${i.title}`, timestamp: new Date(i.createdAt).toISOString() });
    }
    for (const m of memories) {
      if (inRange(new Date(m.createdAt))) entries.push({ id: m.id, type: "memory", title: `Memory: ${m.title}`, timestamp: new Date(m.createdAt).toISOString() });
    }
    for (const r of resources) {
      if (inRange(new Date(r.createdAt))) entries.push({ id: r.id, type: "resource", title: `Resource: ${r.title}`, timestamp: new Date(r.createdAt).toISOString() });
    }
    for (const a of actions) {
      if (inRange(new Date(a.createdAt))) entries.push({ id: a.id, type: "agent_action", title: a.summary, timestamp: new Date(a.createdAt).toISOString() });
    }

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async today(userId: string): Promise<TimelineEntry[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.range(userId, start, end);
  },

  async recent(userId: string, days = 7): Promise<TimelineEntry[]> {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    return this.range(userId, start, end);
  },
};
