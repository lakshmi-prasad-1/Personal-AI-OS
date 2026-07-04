import { notesService } from "../services/notesService";
import { ideasService } from "../services/ideasService";
import { memoriesService } from "../services/memoriesService";
import { resourcesService } from "../services/resourcesService";

export interface AssembledContext {
  pinnedNotes: { title: string; content: string }[];
  recentIdeas: { title: string; status: string }[];
  memories: { title: string; description: string; importanceScore: number }[];
  recentResources: { title: string; category: string }[];
  summary: string;
}

/**
 * Converts a timestamp into a natural recency label ("today", "yesterday",
 * "this week", "last week", "a while ago") so the AI can talk about the
 * user's activity the way a person would, not with raw dates - this is what
 * lets follow-up conversations continue naturally across sessions.
 */
function recencyLabel(date: Date): string {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo <= 7) return "this week";
  if (daysAgo <= 14) return "last week";
  return "a while ago";
}

/**
 * The Context Engine decides what a user's own data is relevant enough to
 * inject into the AI prompt. It intentionally keeps the payload small
 * (top-N per entity, capped length) so prompts stay cheap and focused
 * instead of dumping the user's entire second brain into every request.
 * Reuses the same domain services as REST routes so retrieval logic never
 * diverges from what the user sees in their notes/ideas/memories/resources
 * pages.
 */
export const contextEngine = {
  async gather(userId: string): Promise<AssembledContext> {
    const [allNotes, allIdeas, allMemories, allResources] = await Promise.all([
      notesService.list(userId),
      ideasService.list(userId),
      memoriesService.list(userId),
      resourcesService.list(userId),
    ]);

    const pinnedNotes = allNotes.slice(0, 5);
    const recentIdeas = allIdeas.slice(0, 5);
    const memories = allMemories.slice(0, 8);
    const recentResources = allResources.slice(0, 5);

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
    if (pinnedNotes.length) {
      parts.push(
        `Recent/pinned notes: ${pinnedNotes.map((n) => `${n.title} (${recencyLabel(new Date(n.createdAt))})`).join(", ")}.`,
      );
    }
    if (recentIdeas.length) {
      parts.push(
        `Recent ideas: ${recentIdeas
          .map((i) => `${i.title} [${i.status}, ${recencyLabel(new Date(i.createdAt))}]`)
          .join(", ")}.`,
      );
    }
    if (recentResources.length) {
      parts.push(
        `Recent resources: ${recentResources.map((r) => `${r.title} (${recencyLabel(new Date(r.createdAt))})`).join(", ")}.`,
      );
    }
    context.summary = parts.length
      ? `${parts.join(" ")} When relevant, refer to things naturally by recency (today, yesterday, this week) instead of exact dates, and continue prior conversations/decisions rather than treating every message as brand new.`
      : "";

    return context;
  },
};
