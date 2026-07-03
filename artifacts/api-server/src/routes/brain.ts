import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, notesTable, ideasTable, memoriesTable, resourcesTable } from "@workspace/db";
import { BrainDecideResponse, BrainSearchBody, BrainSearchResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.post("/brain/decide", async (req, res): Promise<void> => {
  const userId = req.auth!.userId;

  const [pinnedNotes, openIdeas, importantMemories, unprocessedResources] = await Promise.all([
    db
      .select()
      .from(notesTable)
      .where(eq(notesTable.userId, userId))
      .orderBy(desc(notesTable.isPinned), desc(notesTable.updatedAt))
      .limit(3),
    db
      .select()
      .from(ideasTable)
      .where(eq(ideasTable.userId, userId))
      .orderBy(desc(ideasTable.updatedAt))
      .limit(5),
    db
      .select()
      .from(memoriesTable)
      .where(eq(memoriesTable.userId, userId))
      .orderBy(desc(memoriesTable.importanceScore))
      .limit(5),
    db
      .select()
      .from(resourcesTable)
      .where(eq(resourcesTable.userId, userId))
      .limit(10),
  ]);

  const decisions: { title: string; description: string; actionType: string }[] = [];

  const staleIdeas = openIdeas.filter((idea) => idea.status === "new");
  if (staleIdeas.length > 0) {
    decisions.push({
      title: `Review ${staleIdeas.length} new idea${staleIdeas.length > 1 ? "s" : ""}`,
      description: `You have ${staleIdeas.length} idea${staleIdeas.length > 1 ? "s" : ""} that haven't been triaged yet.`,
      actionType: "review_ideas",
    });
  }

  const lowConfidenceMemories = importantMemories.filter((m) => m.confidenceScore < 70);
  if (lowConfidenceMemories.length > 0) {
    decisions.push({
      title: "Revisit uncertain memories",
      description: `${lowConfidenceMemories.length} important memories have low confidence scores and may need verification.`,
      actionType: "review_memories",
    });
  }

  const unprocessed = unprocessedResources.filter((r) => !r.isProcessed);
  if (unprocessed.length > 0) {
    decisions.push({
      title: `Process ${unprocessed.length} resource${unprocessed.length > 1 ? "s" : ""}`,
      description: "Some resources haven't been summarized or processed yet.",
      actionType: "process_resources",
    });
  }

  if (pinnedNotes.length === 0) {
    decisions.push({
      title: "Pin your most important note",
      description: "Pinned notes stay at the top so you never lose track of what matters most right now.",
      actionType: "pin_note",
    });
  }

  if (decisions.length === 0) {
    decisions.push({
      title: "You're all caught up",
      description: "No pending actions right now. Capture a new note, idea, or memory to keep building your second brain.",
      actionType: "capture",
    });
  }

  res.json(BrainDecideResponse.parse({ decisions }));
});

router.post("/brain/search", async (req, res): Promise<void> => {
  const parsed = BrainSearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, limit } = parsed.data;
  const userId = req.auth!.userId;
  const max = limit ?? 20;
  const needle = query.toLowerCase();

  const [notes, ideas, memories, resources] = await Promise.all([
    db.select().from(notesTable).where(eq(notesTable.userId, userId)),
    db.select().from(ideasTable).where(eq(ideasTable.userId, userId)),
    db.select().from(memoriesTable).where(eq(memoriesTable.userId, userId)),
    db.select().from(resourcesTable).where(eq(resourcesTable.userId, userId)),
  ]);

  const results = [
    ...notes
      .filter((n) => n.title.toLowerCase().includes(needle) || n.content.toLowerCase().includes(needle))
      .map((n) => ({ id: n.id, title: n.title, type: "note", snippet: n.content.slice(0, 140) || null })),
    ...ideas
      .filter((i) => i.title.toLowerCase().includes(needle) || i.content.toLowerCase().includes(needle))
      .map((i) => ({ id: i.id, title: i.title, type: "idea", snippet: i.content.slice(0, 140) || null })),
    ...memories
      .filter((m) => m.title.toLowerCase().includes(needle) || m.description.toLowerCase().includes(needle))
      .map((m) => ({ id: m.id, title: m.title, type: "memory", snippet: m.description.slice(0, 140) || null })),
    ...resources
      .filter((r) => r.title.toLowerCase().includes(needle) || (r.description ?? "").toLowerCase().includes(needle))
      .map((r) => ({ id: r.id, title: r.title, type: "resource", snippet: r.description ?? null })),
  ].slice(0, max);

  res.json(BrainSearchResponse.parse({ query, results }));
});

export default router;
