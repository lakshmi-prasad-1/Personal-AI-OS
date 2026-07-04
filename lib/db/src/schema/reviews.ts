import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const dailyReviewsTable = pgTable("daily_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD – unique per user per day
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  tasksTotal: integer("tasks_total").notNull().default(0),
  focusMinutes: integer("focus_minutes").notNull().default(0),
  habitsCompleted: integer("habits_completed").notNull().default(0),
  habitsTotal: integer("habits_total").notNull().default(0),
  goalsProgress: jsonb("goals_progress").notNull().default([]),
  knowledgeAdded: integer("knowledge_added").notNull().default(0), // notes+ideas+memories
  aiReview: text("ai_review").notNull().default(""),
  recommendations: jsonb("recommendations").notNull().default([]),
  missedWork: jsonb("missed_work").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const weeklyReviewsTable = pgTable("weekly_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  weekStart: text("week_start").notNull(), // YYYY-MM-DD (Monday)
  weekEnd: text("week_end").notNull(), // YYYY-MM-DD (Sunday)
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  tasksTotal: integer("tasks_total").notNull().default(0),
  focusMinutes: integer("focus_minutes").notNull().default(0),
  habitsCompletionRate: integer("habits_completion_rate").notNull().default(0), // 0–100
  goalsProgress: jsonb("goals_progress").notNull().default([]),
  achievements: jsonb("achievements").notNull().default([]),
  aiReview: text("ai_review").notNull().default(""),
  recommendations: jsonb("recommendations").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDailyReviewSchema = createInsertSchema(dailyReviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWeeklyReviewSchema = createInsertSchema(weeklyReviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDailyReview = z.infer<typeof insertDailyReviewSchema>;
export type InsertWeeklyReview = z.infer<typeof insertWeeklyReviewSchema>;
export type DailyReview = typeof dailyReviewsTable.$inferSelect;
export type WeeklyReview = typeof weeklyReviewsTable.$inferSelect;
