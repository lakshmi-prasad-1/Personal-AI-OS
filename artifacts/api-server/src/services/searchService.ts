import { desc, eq } from "drizzle-orm";
import {
  db,
  notesTable,
  ideasTable,
  memoriesTable,
  resourcesTable,
  chatMessagesTable,
  chatsTable,
  graphNodesTable,
  tasksTable,
  goalsTable,
  habitsTable,
  remindersTable,
  plannerEventsTable,
  subjectsTable,
  careerGoalsTable,
} from "@workspace/db";

export interface SearchResultItem {
  id: string;
  title: string;
  type: "note" | "idea" | "memory" | "resource" | "chat" | "graph_node" | "task" | "goal" | "habit" | "reminder" | "planner_event" | "subject" | "career_goal";
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
   * Ranked universal search across notes, ideas, memories, resources, the
   * knowledge graph, and chat history. Used by both the /brain/search REST
   * endpoint and the AI Search Engine tool so ranking logic never diverges
   * between the two entry points.
   */
  async search(userId: string, query: string, limit = 20): Promise<SearchResultItem[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const [notes, ideas, memories, resources, chats, graphNodes, tasks, goals, habits, reminders, plannerEvents, subjects, careerGoals] = await Promise.all([
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
      db.select().from(graphNodesTable).where(eq(graphNodesTable.userId, userId)),
      db.select().from(tasksTable).where(eq(tasksTable.userId, userId)),
      db.select().from(goalsTable).where(eq(goalsTable.userId, userId)),
      db.select().from(habitsTable).where(eq(habitsTable.userId, userId)),
      db.select().from(remindersTable).where(eq(remindersTable.userId, userId)),
      db.select().from(plannerEventsTable).where(eq(plannerEventsTable.userId, userId)),
      db.select().from(subjectsTable).where(eq(subjectsTable.userId, userId)),
      db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, userId)),
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
    for (const g of graphNodes) {
      const score = scoreMatch(needle, g.label, g.entityType);
      if (score > 0)
        results.push({
          id: g.entityId,
          title: g.label,
          type: "graph_node",
          snippet: `Linked ${g.entityType} in your knowledge graph`,
          score,
        });
    }

    for (const t of tasks) {
      const score = scoreMatch(needle, t.title, t.description ?? "");
      if (score > 0 && !t.isDeleted) results.push({ id: t.id, title: t.title, type: "task", snippet: t.description ?? null, score });
    }
    for (const g of goals) {
      const score = scoreMatch(needle, g.title, g.description ?? "");
      if (score > 0) results.push({ id: g.id, title: g.title, type: "goal", snippet: g.description ?? null, score });
    }
    for (const h of habits) {
      const score = scoreMatch(needle, h.name, h.description ?? "");
      if (score > 0) results.push({ id: h.id, title: h.name, type: "habit", snippet: h.description ?? null, score });
    }
    for (const r of reminders) {
      const score = scoreMatch(needle, r.title, r.body ?? "");
      if (score > 0) results.push({ id: r.id, title: r.title, type: "reminder", snippet: r.body ?? null, score });
    }
    for (const p of plannerEvents) {
      const score = scoreMatch(needle, p.title, p.description ?? "");
      if (score > 0) results.push({ id: p.id, title: p.title, type: "planner_event", snippet: p.description ?? null, score });
    }
    for (const s of subjects) {
      const score = scoreMatch(needle, s.name, s.code ?? "");
      if (score > 0) results.push({ id: s.id, title: s.name, type: "subject", snippet: s.category ?? null, score });
    }
    for (const cg of careerGoals) {
      const score = scoreMatch(needle, cg.title, cg.description ?? "");
      if (score > 0) results.push({ id: cg.id, title: cg.title, type: "career_goal", snippet: cg.description ?? null, score });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  },
};
