import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const studyProfilesTable = pgTable("study_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  semester: text("semester"),
  branch: text("branch"),
  credits: integer("credits"),
  preferredStudyTime: text("preferred_study_time"), // e.g. "morning" | "evening" | "night"
  weakSubjects: text("weak_subjects").array().notNull().default([]),
  strongSubjects: text("strong_subjects").array().notNull().default([]),
  targetCgpa: text("target_cgpa"),
  dailyStudyGoalMinutes: integer("daily_study_goal_minutes").notNull().default(120),
  weeklyStudyGoalMinutes: integer("weekly_study_goal_minutes").notNull().default(840),
  preferredRevisionStyle: text("preferred_revision_style"), // e.g. "flashcards" | "quizzes" | "notes"
  preferredLearningStyle: text("preferred_learning_style"), // e.g. "visual" | "reading" | "practice"
  examPattern: text("exam_pattern"),
  programmingLanguages: text("programming_languages").array().notNull().default([]),
  currentSkills: text("current_skills").array().notNull().default([]),
  targetSkills: text("target_skills").array().notNull().default([]),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudyProfileSchema = createInsertSchema(studyProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudyProfile = z.infer<typeof insertStudyProfileSchema>;
export type StudyProfile = typeof studyProfilesTable.$inferSelect;
