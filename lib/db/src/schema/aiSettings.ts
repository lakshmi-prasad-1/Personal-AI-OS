import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * One row per user. Tunables for how proactive/aggressive the AI is
 * (Phase 4, Module 22). Read by decision/planner engines, not enforced at
 * the DB layer — services choose to honor them.
 */
export const aiSettingsTable = pgTable("ai_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),

  planningAggressiveness: text("planning_aggressiveness").notNull().default("balanced"), // relaxed | balanced | aggressive
  aiPersonality: text("ai_personality").notNull().default("supportive"), // supportive | direct | motivational | analytical
  recommendationFrequency: text("recommendation_frequency").notNull().default("normal"), // low | normal | high
  studyMode: boolean("study_mode").notNull().default(true),
  careerMode: boolean("career_mode").notNull().default(true),
  focusMode: boolean("focus_mode").notNull().default(true),
  voiceMode: boolean("voice_mode").notNull().default(true),
  privacyMode: text("privacy_mode").notNull().default("standard"), // standard | minimal_logging
  automationPreferences: text("automation_preferences").notNull().default("suggest_only"), // suggest_only | auto_apply_low_risk

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiSettingsSchema = createInsertSchema(aiSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiSettings = z.infer<typeof insertAiSettingsSchema>;
export type AiSettings = typeof aiSettingsTable.$inferSelect;
