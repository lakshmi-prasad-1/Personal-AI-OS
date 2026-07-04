import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const plannerEventsTable = pgTable("planner_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  taskId: uuid("task_id"), // optional link to a task
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  // type: study | project | coding | college | break | free | buffer | custom
  type: text("type").notNull().default("custom"),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time"), // HH:MM
  endTime: text("end_time"), // HH:MM
  durationMinutes: integer("duration_minutes"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdByAi: boolean("created_by_ai").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlannerEventSchema = createInsertSchema(plannerEventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlannerEvent = z.infer<typeof insertPlannerEventSchema>;
export type PlannerEvent = typeof plannerEventsTable.$inferSelect;
