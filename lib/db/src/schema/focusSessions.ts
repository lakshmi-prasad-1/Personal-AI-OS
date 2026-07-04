import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const focusSessionsTable = pgTable("focus_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  taskId: uuid("task_id"), // optional linked task
  title: text("title").notNull().default("Focus Session"),
  // type: pomodoro | deep_work | study | coding
  type: text("type").notNull().default("pomodoro"),
  plannedMinutes: integer("planned_minutes").notNull().default(25),
  breakMinutes: integer("break_minutes").notNull().default(5),
  longBreakMinutes: integer("long_break_minutes").notNull().default(15),
  actualMinutes: integer("actual_minutes"),
  // status: idle | active | paused | completed | cancelled
  status: text("status").notNull().default("idle"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  totalPauseMinutes: integer("total_pause_minutes").notNull().default(0),
  pomodoroCount: integer("pomodoro_count").notNull().default(0),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFocusSessionSchema = createInsertSchema(focusSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFocusSession = z.infer<typeof insertFocusSessionSchema>;
export type FocusSession = typeof focusSessionsTable.$inferSelect;
