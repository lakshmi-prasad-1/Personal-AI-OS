import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const goalsTable = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  // category: career | learning | health | project | finance | personal | other
  category: text("category").notNull().default("personal"),
  // type: short_term | long_term
  type: text("type").notNull().default("long_term"),
  priority: text("priority").notNull().default("medium"), // low | medium | high
  // status: active | completed | paused | abandoned
  status: text("status").notNull().default("active"),
  progressPercent: integer("progress_percent").notNull().default(0), // 0–100
  targetDate: text("target_date"), // YYYY-MM-DD
  completedAt: timestamp("completed_at", { withTimezone: true }),
  // milestones: [{ id, title, done, dueDate }]
  milestones: jsonb("milestones").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
