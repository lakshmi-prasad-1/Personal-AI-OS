import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * Automation Foundation architecture (Phase 4, Module 18/19). Stores rule
 * DEFINITIONS only — "if X then suggest/do Y". No external delivery
 * (email/push/webhooks) is wired up yet; `RuleEngine`/`TriggerEngine`
 * (see automationService.ts) evaluate these against app data and produce
 * suggestions, which land in agent_actions like everything else.
 */
export const automationRulesTable = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  // trigger: { type: "assignment_due_soon" | "focus_goal_missed" | "resume_outdated" | "habit_streak_broken" | "custom", params: {...} }
  trigger: jsonb("trigger").notNull().default({}),
  // action: { type: "create_reminder" | "suggest_reschedule" | "recommend_update" | "suggest_recovery_plan" | "notify", params: {...} }
  action: jsonb("action").notNull().default({}),
  isEnabled: boolean("is_enabled").notNull().default(true),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAutomationRuleSchema = createInsertSchema(automationRulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationRule = typeof automationRulesTable.$inferSelect;
