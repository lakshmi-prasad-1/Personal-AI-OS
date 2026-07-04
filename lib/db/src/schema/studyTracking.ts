import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { subjectsTable, topicsTable } from "./subjects";

export const revisionSessionsTable = pgTable("revision_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: "set null" }),
  type: text("type").notNull().default("daily"), // daily | weekly | monthly | exam | forgotten | weak | random | priority
  itemsReviewed: integer("items_reviewed").notNull().default(0),
  notes: text("notes").notNull().default(""),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weakTopicsTable = pgTable("weak_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjectsTable.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull().default(""),
  weaknessScore: integer("weakness_score").notNull().default(50), // 0-100, higher = weaker
  status: text("status").notNull().default("active"), // active | resolved
  lastAnalyzedAt: timestamp("last_analyzed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studySessionsTable = pgTable("study_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: "set null" }),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  type: text("type").notNull().default("study"), // study | revision | practice | coding
  notes: text("notes").notNull().default(""),
  date: text("date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRevisionSessionSchema = createInsertSchema(revisionSessionsTable).omit({ id: true, completedAt: true });
export type InsertRevisionSession = z.infer<typeof insertRevisionSessionSchema>;
export type RevisionSession = typeof revisionSessionsTable.$inferSelect;

export const insertWeakTopicSchema = createInsertSchema(weakTopicsTable).omit({ id: true, createdAt: true, lastAnalyzedAt: true });
export type InsertWeakTopic = z.infer<typeof insertWeakTopicSchema>;
export type WeakTopic = typeof weakTopicsTable.$inferSelect;

export const insertStudySessionSchema = createInsertSchema(studySessionsTable).omit({ id: true, createdAt: true });
export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type StudySession = typeof studySessionsTable.$inferSelect;
