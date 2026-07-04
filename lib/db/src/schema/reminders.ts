import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const remindersTable = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  // recurringPattern: daily | weekly | monthly
  recurringPattern: text("recurring_pattern"),
  recurringDays: integer("recurring_days").array().notNull().default([]),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  isSnoozed: boolean("is_snoozed").notNull().default(false),
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
  createdByAi: boolean("created_by_ai").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReminderSchema = createInsertSchema(remindersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof remindersTable.$inferSelect;
