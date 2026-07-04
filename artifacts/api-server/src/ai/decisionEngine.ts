import { notesService } from "../services/notesService";
import { ideasService } from "../services/ideasService";
import { memoriesService } from "../services/memoriesService";
import { resourcesService } from "../services/resourcesService";
import { agentActionsService } from "../services/agentActionsService";
import { subjectService } from "../services/subjectService";
import { flashcardService } from "../services/flashcardService";
import { revisionService } from "../services/revisionService";

export type DecisionPriority = "low" | "medium" | "high";

export interface Decision {
  title: string;
  description: string;
  actionType: string;
  reason: string;
  priority: DecisionPriority;
}

/**
 * Heuristic recommendation engine. This backs both the /brain/decide REST
 * endpoint and the AI Action Engine's get_recommendations tool so dashboard
 * suggestions and chat suggestions are always consistent. Reuses the same
 * domain services as everything else so query logic never diverges.
 *
 * Every recommendation carries a `reason` (the signals that produced it) and
 * a `priority`, and considers not just current data but recent AI activity
 * (agent_actions) so recommendations reflect what the user has actually been
 * doing lately, not just a static snapshot.
 */
export const decisionEngine = {
  async decide(userId: string): Promise<Decision[]> {
    const [notes, ideas, memories, resources, recentActivity, subjects, dueFlashcards, weakTopics, topics] = await Promise.all([
      notesService.list(userId),
      ideasService.list(userId),
      memoriesService.list(userId),
      resourcesService.list(userId),
      agentActionsService.recent(userId, 15),
      subjectService.list(userId),
      flashcardService.due(userId, 100),
      revisionService.listWeakTopics(userId),
      subjectService.listTopics(userId),
    ]);

    const pinnedNotes = notes.slice(0, 3);
    const openIdeas = ideas.slice(0, 5);
    const importantMemories = memories.slice(0, 5);
    const unprocessedResources = resources.slice(0, 10);

    const recentActionCounts = recentActivity.reduce<Record<string, number>>((acc, a) => {
      acc[a.actionType] = (acc[a.actionType] ?? 0) + 1;
      return acc;
    }, {});

    const decisions: Decision[] = [];

    // Status/priority values are free-text and the frontend currently writes
    // them as uppercase (DRAFT/HIGH) while some defaults are lowercase - compare
    // case-insensitively so recommendations work regardless of casing.
    const staleIdeas = openIdeas.filter((idea) => idea.status.toLowerCase() === "new" || idea.status.toLowerCase() === "draft");
    if (staleIdeas.length > 0) {
      const highPriorityIdeas = staleIdeas.filter((i) => i.priority.toLowerCase() === "high");
      decisions.push({
        title: `Review ${staleIdeas.length} new idea${staleIdeas.length > 1 ? "s" : ""}`,
        description: `You have ${staleIdeas.length} idea${staleIdeas.length > 1 ? "s" : ""} that haven't been triaged yet.`,
        actionType: "review_ideas",
        reason:
          highPriorityIdeas.length > 0
            ? `${highPriorityIdeas.length} of these are marked high priority, and untriaged ideas tend to get forgotten the longer they sit.`
            : "Untriaged ideas tend to get forgotten the longer they sit without a status.",
        priority: highPriorityIdeas.length > 0 ? "high" : "medium",
      });
    }

    const lowConfidenceMemories = importantMemories.filter((m) => m.confidenceScore < 70);
    if (lowConfidenceMemories.length > 0) {
      decisions.push({
        title: "Revisit uncertain memories",
        description: `${lowConfidenceMemories.length} important memories have low confidence scores and may need verification.`,
        actionType: "review_memories",
        reason:
          "Low-confidence memories can quietly bias future recommendations and context if they're wrong, so I'm flagging them early.",
        priority: "medium",
      });
    }

    const unprocessed = unprocessedResources.filter((r) => !r.isProcessed);
    if (unprocessed.length > 0) {
      decisions.push({
        title: `Process ${unprocessed.length} resource${unprocessed.length > 1 ? "s" : ""}`,
        description: "Some resources haven't been summarized or processed yet.",
        actionType: "process_resources",
        reason: "Unprocessed resources are harder to find later since they lack a searchable summary.",
        priority: "low",
      });
    }

    if (pinnedNotes.length === 0) {
      decisions.push({
        title: "Pin your most important note",
        description: "Pinned notes stay at the top so you never lose track of what matters most right now.",
        actionType: "pin_note",
        reason: "You have no pinned notes right now, so nothing is currently surfaced as your top priority.",
        priority: "low",
      });
    }

    const recentSaves = (recentActionCounts["create_resource"] ?? 0) + (recentActionCounts["create_note"] ?? 0);
    if (recentSaves >= 3 && (recentActionCounts["search"] ?? 0) === 0) {
      decisions.push({
        title: "Search what you've been saving",
        description: "You've been actively capturing notes and resources — try searching to connect them.",
        actionType: "search_recent_captures",
        reason: `You logged ${recentSaves} recent captures without a single search, so related items may already exist and be worth linking together.`,
        priority: "low",
      });
    }

    // ─── Study OS (Phase 2B) ────────────────────────────────────────────────
    if (dueFlashcards.length > 0) {
      decisions.push({
        title: `Review ${dueFlashcards.length} flashcard${dueFlashcards.length > 1 ? "s" : ""}`,
        description: "Flashcards due for spaced-repetition review are ready — a few minutes now keeps retention high.",
        actionType: "review_flashcards",
        reason: `${dueFlashcards.length} flashcard(s) hit their scheduled review date.`,
        priority: dueFlashcards.length >= 10 ? "high" : "medium",
      });
    }

    if (weakTopics.length > 0) {
      decisions.push({
        title: `Strengthen ${weakTopics.length} weak topic${weakTopics.length > 1 ? "s" : ""}`,
        description: "Some topics are flagged as weak based on quiz performance or your own flags.",
        actionType: "study_weak_topics",
        reason: weakTopics.slice(0, 2).map((w) => w.reason).filter(Boolean).join("; ") || "Weak topics were flagged and haven't been resolved yet.",
        priority: "high",
      });
    }

    const revisionNeeded = topics.filter((t) => t.status === "revision_needed");
    if (revisionNeeded.length > 0) {
      decisions.push({
        title: `Revise ${revisionNeeded.length} topic${revisionNeeded.length > 1 ? "s" : ""}`,
        description: "Topics you flagged as needing revision are waiting.",
        actionType: "revise_topics",
        reason: `${revisionNeeded.length} topic(s) are marked "revision needed".`,
        priority: "medium",
      });
    }

    const nearingExams = subjects.filter((s) => {
      if (!s.examDate) return false;
      const days = Math.round((new Date(s.examDate).getTime() - Date.now()) / 86_400_000);
      return days >= 0 && days <= 7;
    });
    if (nearingExams.length > 0) {
      decisions.push({
        title: `Exam coming up: ${nearingExams.map((s) => s.name).join(", ")}`,
        description: "One or more subjects have an exam within the next 7 days.",
        actionType: "exam_prep",
        reason: `${nearingExams.map((s) => `${s.name} (${s.examDate})`).join(", ")} is within a week.`,
        priority: "high",
      });
    }

    if (decisions.length === 0) {
      decisions.push({
        title: "You're all caught up",
        description: "No pending actions right now. Capture a new note, idea, or memory to keep building your second brain.",
        actionType: "capture",
        reason: "Every idea is triaged, every memory is confident, and every resource is processed.",
        priority: "low",
      });
    }

    const priorityWeight: Record<DecisionPriority, number> = { high: 0, medium: 1, low: 2 };
    return decisions.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);
  },
};
