import { desc, eq } from "drizzle-orm";
import {
  db,
  notesTable,
  ideasTable,
  memoriesTable,
  resourcesTable,
  chatMessagesTable,
  chatsTable,
} from "@workspace/db";

export interface SearchResultItem {
  id: string;
  title: string;
  type: "note" | "idea" | "memory" | "resource" | "chat";
  snippet: string | null;
  score: number;
}

function scoreMatch(needle: string, title: string, body: string): number {
  const t = title.toLowerCase();
  const b = body.toLowerCase();
  if (!t.includes(needle) && !b.includes(needle)) return 0;
  let score = 0;
  if (t === needle) score += 10;
  else if (t.startsWith(needle)) score += 6;
  else if (t.includes(needle)) score += 4;
  if (b.includes(needle)) score += 1;
  return score;
}

export const searchService = {
  /**
   * Ranked universal search across notes, ideas, memories, resources and chat
   * history. Used by both the /brain/search REST endpoint and the AI Search
   * Engine tool so ranking logic never diverges between the two entry points.
   */
  async search(userId: string, query: string, limit = 20): Promise<SearchResultItem[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const [notes, ideas, memories, resources, chats] = await Promise.all([
      db.select().from(notesTable).where(eq(notesTable.userId, userId)),
      db.select().from(ideasTable).where(eq(ideasTable.userId, userId)),
      db.select().from(memoriesTable).where(eq(memoriesTable.userId, userId)),
      db.select().from(resourcesTable).where(eq(resourcesTable.userId, userId)),
      db
        .select({
          id: chatMessagesTable.id,
          content: chatMessagesTable.content,
          chatId: chatMessagesTable.chatId,
          chatTitle: chatsTable.title,
          createdAt: chatMessagesTable.createdAt,
        })
        .from(chatMessagesTable)
        .innerJoin(chatsTable, eq(chatMessagesTable.chatId, chatsTable.id))
        .where(eq(chatsTable.userId, userId))
        .orderBy(desc(chatMessagesTable.createdAt))
        .limit(500),
    ]);

    const results: SearchResultItem[] = [];

    for (const n of notes) {
      const score = scoreMatch(needle, n.title, n.content);
      if (score > 0) results.push({ id: n.id, title: n.title, type: "note", snippet: n.content.slice(0, 160) || null, score });
    }
    for (const i of ideas) {
      const score = scoreMatch(needle, i.title, i.content);
      if (score > 0) results.push({ id: i.id, title: i.title, type: "idea", snippet: i.content.slice(0, 160) || null, score });
    }
    for (const m of memories) {
      const score = scoreMatch(needle, m.title, m.description);
      if (score > 0)
        results.push({ id: m.id, title: m.title, type: "memory", snippet: m.description.slice(0, 160) || null, score });
    }
    for (const r of resources) {
      const score = scoreMatch(needle, r.title, r.description ?? "");
      if (score > 0) results.push({ id: r.id, title: r.title, type: "resource", snippet: r.description ?? null, score });
    }
    for (const c of chats) {
      const score = scoreMatch(needle, c.chatTitle, c.content);
      if (score > 0)
        results.push({
          id: c.chatId,
          title: c.chatTitle,
          type: "chat",
          snippet: c.content.slice(0, 160) || null,
          score,
        });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  },
};
