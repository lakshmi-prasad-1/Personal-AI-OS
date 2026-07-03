import { doublePrecision, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const graphNodesTable = pgTable("graph_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const graphEdgesTable = pgTable("graph_edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  sourceNodeId: uuid("source_node_id").notNull().references(() => graphNodesTable.id, { onDelete: "cascade" }),
  targetNodeId: uuid("target_node_id").notNull().references(() => graphNodesTable.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(),
  weight: doublePrecision("weight").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGraphNodeSchema = createInsertSchema(graphNodesTable).omit({ id: true, createdAt: true });
export type InsertGraphNode = z.infer<typeof insertGraphNodeSchema>;
export type GraphNode = typeof graphNodesTable.$inferSelect;

export const insertGraphEdgeSchema = createInsertSchema(graphEdgesTable).omit({ id: true, createdAt: true });
export type InsertGraphEdge = z.infer<typeof insertGraphEdgeSchema>;
export type GraphEdge = typeof graphEdgesTable.$inferSelect;
