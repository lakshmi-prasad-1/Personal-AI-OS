import { integer, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { subjectsTable, topicsTable } from "./subjects";
import { resourcesTable } from "./resources";

export const flashcardsTable = pgTable("flashcards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjectsTable.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: "cascade" }),
  resourceId: uuid("resource_id").references(() => resourcesTable.id, { onDelete: "set null" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  type: text("type").notNull().default("concept"), // definition | concept | formula | programming | revision
  difficulty: text("difficulty").notNull().default("medium"), // easy | medium | hard
  source: text("source").notNull().default("manual"), // manual | ai
  reviewCount: integer("review_count").notNull().default(0),
  masteryScore: integer("mastery_score").notNull().default(0), // 0-100
  easeFactor: real("ease_factor").notNull().default(2.5), // SM-2
  intervalDays: integer("interval_days").notNull().default(0),
  nextReviewDate: text("next_review_date"), // YYYY-MM-DD
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const flashcardReviewsTable = pgTable("flashcard_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  flashcardId: uuid("flashcard_id").notNull().references(() => flashcardsTable.id, { onDelete: "cascade" }),
  rating: text("rating").notNull(), // again | hard | good | easy
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcardsTable.$inferSelect;

export const insertFlashcardReviewSchema = createInsertSchema(flashcardReviewsTable).omit({ id: true, reviewedAt: true });
export type InsertFlashcardReview = z.infer<typeof insertFlashcardReviewSchema>;
export type FlashcardReview = typeof flashcardReviewsTable.$inferSelect;
