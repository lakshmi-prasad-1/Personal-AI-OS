import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { subjectsTable, topicsTable } from "./subjects";

export const quizzesTable = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjectsTable.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // questions: [{ id, type, question, options?, correctAnswer, explanation, difficulty, hint? }]
  questions: jsonb("questions").notNull().default([]),
  difficulty: text("difficulty").notNull().default("medium"), // easy | medium | hard | adaptive
  source: text("source").notNull().default("ai"), // ai | manual
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const quizAttemptsTable = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  quizId: uuid("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull().default([]), // [{ questionId, answer }]
  score: integer("score").notNull().default(0), // percentage
  totalQuestions: integer("total_questions").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  timeSpentSeconds: integer("time_spent_seconds"),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuizSchema = createInsertSchema(quizzesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzesTable.$inferSelect;

export const insertQuizAttemptSchema = createInsertSchema(quizAttemptsTable).omit({ id: true, completedAt: true });
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttemptsTable.$inferSelect;
