import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ideasTable = pgTable("ideas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  category: text("category"),
  tags: text("tags").array().notNull().default([]),
  status: text("status").notNull().default("new"),
  priority: text("priority").notNull().default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertIdeaSchema = createInsertSchema(ideasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type Idea = typeof ideasTable.$inferSelect;
