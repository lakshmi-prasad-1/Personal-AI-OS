import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const tasksTable = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"), // null = top-level task; set = subtask
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  priority: text("priority").notNull().default("medium"), // low | medium | high | urgent
  category: text("category").notNull().default("general"),
  status: text("status").notNull().default("todo"), // todo | in_progress | done | archived
  dueDate: text("due_date"), // ISO date string YYYY-MM-DD
  dueTime: text("due_time"), // HH:MM
  estimatedMinutes: integer("estimated_minutes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  tags: text("tags").array().notNull().default([]),
  difficulty: text("difficulty").notNull().default("medium"), // easy | medium | hard
  aiSummary: text("ai_summary"),
  createdByAi: boolean("created_by_ai").notNull().default(false),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringPattern: text("recurring_pattern"), // daily | weekly | monthly
  recurringDays: integer("recurring_days").array().notNull().default([]), // 0–6 Sun–Sat
  dependsOn: uuid("depends_on").array().notNull().default([]),
  isDeleted: boolean("is_deleted").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
