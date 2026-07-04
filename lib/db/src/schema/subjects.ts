import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const subjectsTable = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
  semester: text("semester"),
  credits: integer("credits"),
  category: text("category").notNull().default("core"), // core | elective | lab | project
  examDate: text("exam_date"), // YYYY-MM-DD
  priority: text("priority").notNull().default("medium"), // low | medium | high
  progressPercent: integer("progress_percent").notNull().default(0),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const topicsTable = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("not_started"), // not_started | in_progress | completed | revision_needed
  difficulty: text("difficulty").notNull().default("medium"), // easy | medium | hard
  importance: text("importance").notNull().default("medium"), // low | medium | high
  estimatedHours: integer("estimated_hours"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjectsTable.$inferSelect;

export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topicsTable.$inferSelect;
