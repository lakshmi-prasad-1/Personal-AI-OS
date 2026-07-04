import { plannerService } from "./plannerService";
import { lifeProfileService } from "./lifeProfileService";
import { taskService } from "./taskService";
import { habitService } from "./habitService";
import { reminderService } from "./reminderService";
import type { PlannerEvent } from "@workspace/db";

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor((total % (24 * 60)) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Phase 4, Modules 3-5: Smart Daily/Weekly/Monthly Planner. Composes the
 * existing plannerService (planner_events table), lifeProfileService (work
 * hours, wake/sleep), taskService, habitService, and reminderService into a
 * generated schedule. Never duplicates task/habit/reminder storage — a
 * generated planner event with `taskId` set just points back at the task.
 */
export const dailyPlannerService = {
  async generateDaily(userId: string, date: string): Promise<PlannerEvent[]> {
    const existing = await plannerService.getDay(userId, date);
    if (existing.length > 0) return existing;

    const profile = await lifeProfileService.getOrCreate(userId);
    const wake = profile.wakeTime || "08:00";
    const sleep = profile.sleepTime || "22:00";
    const workBlocks = (profile.preferredWorkHours as { start: string; end: string }[]) ?? [];
    const breakMinutes = profile.breakDurationMinutes || 15;

    const [dueTasks, upcomingTasks, habitStatus, reminders] = await Promise.all([
      taskService.listDueToday(userId),
      taskService.listUpcoming(userId),
      habitService.getTodayStatus(userId),
      reminderService.list(userId),
    ]);

    const tasksToSchedule = [...dueTasks, ...upcomingTasks.filter((t) => !dueTasks.some((d) => d.id === t.id))].slice(0, 8);

    const created: PlannerEvent[] = [];
    let cursor = workBlocks[0]?.start || addMinutes(wake, 60);
    const dayEnd = workBlocks[workBlocks.length - 1]?.end || sleep;

    for (const task of tasksToSchedule) {
      if (toMinutes(cursor) >= toMinutes(dayEnd)) break;
      const durationMinutes = 45;
      const startTime = cursor;
      const endTime = addMinutes(cursor, durationMinutes);
      const event = await plannerService.create(userId, {
        taskId: task.id,
        title: task.title,
        description: `Auto-scheduled from your task list (${task.priority} priority)`,
        type: "project",
        date,
        startTime,
        endTime,
        durationMinutes,
        isCompleted: false,
        createdByAi: true,
      });
      created.push(event);
      cursor = addMinutes(endTime, breakMinutes);
    }

    for (const { habit, completedToday } of habitStatus) {
      if (completedToday) continue;
      if (toMinutes(cursor) >= toMinutes(dayEnd)) break;
      const durationMinutes = 20;
      const startTime = cursor;
      const endTime = addMinutes(cursor, durationMinutes);
      const event = await plannerService.create(userId, {
        title: habit.name,
        description: "Habit reminder, auto-scheduled",
        type: "custom",
        date,
        startTime,
        endTime,
        durationMinutes,
        isCompleted: false,
        createdByAi: true,
      });
      created.push(event);
      cursor = addMinutes(endTime, 5);
    }

    const todayReminders = reminders.filter((r) => new Date(r.remindAt).toISOString().slice(0, 10) === date);
    for (const reminder of todayReminders) {
      created.push(
        await plannerService.create(userId, {
          title: `Reminder: ${reminder.title}`,
          description: reminder.body,
          type: "custom",
          date,
          startTime: new Date(reminder.remindAt).toISOString().slice(11, 16),
          endTime: null,
          durationMinutes: null,
          isCompleted: false,
          createdByAi: true,
        }),
      );
    }

    return created.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  },

  async generateWeekly(userId: string, weekStart: string): Promise<Record<string, PlannerEvent[]>> {
    const start = new Date(weekStart);
    const byDay: Record<string, PlannerEvent[]> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDay[key] = await this.generateDaily(userId, key);
    }
    return byDay;
  },

  async generateMonthly(userId: string, monthStart: string): Promise<{ weekStart: string; events: PlannerEvent[] }[]> {
    const start = new Date(monthStart);
    const month = start.getMonth();
    const weeks: { weekStart: string; events: PlannerEvent[] }[] = [];
    let cursor = new Date(start);
    while (cursor.getMonth() === month) {
      const weekStartKey = cursor.toISOString().slice(0, 10);
      const week = await this.generateWeekly(userId, weekStartKey);
      weeks.push({ weekStart: weekStartKey, events: Object.values(week).flat() });
      cursor = new Date(cursor.getTime() + 7 * 86_400_000);
    }
    return weeks;
  },
};
