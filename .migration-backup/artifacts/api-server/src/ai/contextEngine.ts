import { desc, eq } from "drizzle-orm";
import { db, notesTable, ideasTable, memoriesTable, resourcesTable } from "@workspace/db";

export interface AssembledContext {
  pinnedNotes: { title: string; content: string }[];
  recentIdeas: { title: string; status: string }[];
  memories: { title: string; description: string; importanceScore: number }[];
  recentResources: { title: string; category: string }[];
  summary: string;
}

/**
 * The Context Engine decides what a user's own data is relevant enough to
 * inject into the AI prompt. It intentionally keeps the payload small
 * (top-N per entity, capped length) so prompts stay cheap and focused
 * instead of dumping the user's entire second brain into every request.
 */
export const contextEngine = {
  async gather(userId: string): Promise<AssembledContext> {
    const [pinnedNotes, recentIdeas, memories, recentResources] = await Promise.all([
      db
        .select()
        .from(notesTable)
        .where(eq(notesTable.userId, userId))
        .orderBy(desc(notesTable.isPinned), desc(notesTable.updatedAt))
        .limit(5),
      db.select().from(ideasTable).where(eq(ideasTable.userId, userId)).orderBy(desc(ideasTable.updatedAt)).limit(5),
      db
        .select()
        .from(memoriesTable)
        .where(eq(memoriesTable.userId, userId))
        .orderBy(desc(memoriesTable.importanceScore))
        .limit(8),
      db
        .select()
        .from(resourcesTable)
        .where(eq(resourcesTable.userId, userId))
        .orderBy(desc(resourcesTable.updatedAt))
        .limit(5),
    ]);

    const context: AssembledContext = {
      pinnedNotes: pinnedNotes.map((n) => ({ title: n.title, content: n.content.slice(0, 200) })),
      recentIdeas: recentIdeas.map((i) => ({ title: i.title, status: i.status })),
      memories: memories.map((m) => ({
        title: m.title,
        description: m.description.slice(0, 160),
        importanceScore: m.importanceScore,
      })),
      recentResources: recentResources.map((r) => ({ title: r.title, category: r.category })),
      summary: "",
    };

    const parts: string[] = [];
    if (context.memories.length) {
      parts.push(
        `Known long-term memories about the user: ${context.memories
          .map((m) => `${m.title} (${m.description})`)
          .join("; ")}.`,
      );
    }
    if (context.pinnedNotes.length) {
      parts.push(`Recent/pinned notes: ${context.pinnedNotes.map((n) => n.title).join(", ")}.`);
    }
    if (context.recentIdeas.length) {
      parts.push(`Recent ideas: ${context.recentIdeas.map((i) => `${i.title} [${i.status}]`).join(", ")}.`);
    }
    if (context.recentResources.length) {
      parts.push(`Recent resources: ${context.recentResources.map((r) => r.title).join(", ")}.`);
    }
    context.summary = parts.join(" ");

    return context;
  },
};
