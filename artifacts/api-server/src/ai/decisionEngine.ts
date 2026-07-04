import { desc, eq } from "drizzle-orm";
import { db, notesTable, ideasTable, memoriesTable, resourcesTable } from "@workspace/db";

export interface Decision {
  title: string;
  description: string;
  actionType: string;
}

/**
 * Heuristic recommendation engine. This backs both the /brain/decide REST
 * endpoint and the AI Action Engine's get_recommendations tool so dashboard
 * suggestions and chat suggestions are always consistent.
 */
export const decisionEngine = {
  async decide(userId: string): Promise<Decision[]> {
    const [pinnedNotes, openIdeas, importantMemories, unprocessedResources] = await Promise.all([
      db
        .select()
        .from(notesTable)
        .where(eq(notesTable.userId, userId))
        .orderBy(desc(notesTable.isPinned), desc(notesTable.updatedAt))
        .limit(3),
      db.select().from(ideasTable).where(eq(ideasTable.userId, userId)).orderBy(desc(ideasTable.updatedAt)).limit(5),
      db
        .select()
        .from(memoriesTable)
        .where(eq(memoriesTable.userId, userId))
        .orderBy(desc(memoriesTable.importanceScore))
        .limit(5),
      db.select().from(resourcesTable).where(eq(resourcesTable.userId, userId)).limit(10),
    ]);

    const decisions: Decision[] = [];

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

    return decisions;
  },
};
