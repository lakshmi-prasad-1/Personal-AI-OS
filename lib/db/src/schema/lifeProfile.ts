import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * One row per user. Stores the "life profile" the AI reasons over for
 * daily/weekly/monthly planning and the Life Decision Engine (Phase 4,
 * Module 1). Distinct from studyProfile/careerProfile which cover their own
 * domains — this is the cross-cutting personal/lifestyle layer.
 */
export const lifeProfilesTable = pgTable("life_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),

  wakeTime: text("wake_time"), // HH:MM
  sleepTime: text("sleep_time"), // HH:MM
  preferredWorkHours: jsonb("preferred_work_hours").notNull().default([]), // [{ start, end }]
  studyHours: jsonb("study_hours").notNull().default([]), // [{ start, end }]
  breakDurationMinutes: integer("break_duration_minutes").notNull().default(15),
  exerciseSchedule: text("exercise_schedule").notNull().default(""),
  foodTiming: jsonb("food_timing").notNull().default([]), // [{ meal, time }]
  collegeSchedule: text("college_schedule").notNull().default(""),
  workSchedule: text("work_schedule").notNull().default(""),
  timezone: text("timezone").notNull().default("UTC"),
  preferredNotificationTimes: jsonb("preferred_notification_times").notNull().default([]), // ["08:00", "20:00"]
  preferredLearningStyle: text("preferred_learning_style").notNull().default(""),
  preferredPlanningStyle: text("preferred_planning_style").notNull().default("balanced"), // relaxed | balanced | aggressive
  energyPattern: text("energy_pattern").notNull().default(""), // e.g. "morning_person", "night_owl"
  dailyProductivityPattern: jsonb("daily_productivity_pattern").notNull().default([]), // [{ hour, energyLevel }]
  weekendSchedule: text("weekend_schedule").notNull().default(""),
  personalInterests: jsonb("personal_interests").notNull().default([]), // string[]
  personalPriorities: jsonb("personal_priorities").notNull().default([]), // string[]
  personalValues: jsonb("personal_values").notNull().default([]), // string[]
  favoriteTechnologies: jsonb("favorite_technologies").notNull().default([]), // string[]
  futureGoals: text("future_goals").notNull().default(""),
  lifeVision: text("life_vision").notNull().default(""),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLifeProfileSchema = createInsertSchema(lifeProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLifeProfile = z.infer<typeof insertLifeProfileSchema>;
export type LifeProfile = typeof lifeProfilesTable.$inferSelect;
