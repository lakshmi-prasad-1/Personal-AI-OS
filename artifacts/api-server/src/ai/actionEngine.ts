import { z } from "zod/v4";
import { notesService } from "../services/notesService";
import { ideasService } from "../services/ideasService";
import { memoriesService } from "../services/memoriesService";
import { resourcesService } from "../services/resourcesService";
import { agentActionsService } from "../services/agentActionsService";
import { searchService } from "../services/searchService";
import { decisionEngine } from "./decisionEngine";
import { logger } from "../lib/logger";

const createNoteArgs = z.object({
  title: z.string().min(1),
  content: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
});

const createIdeaArgs = z.object({
  title: z.string().min(1),
  content: z.string().optional().default(""),
  category: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  tags: z.array(z.string()).optional().default([]),
});

const createMemoryArgs = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().optional().default("general"),
  importanceScore: z.number().int().min(0).max(100).optional().default(70),
  tags: z.array(z.string()).optional().default([]),
});

const createResourceArgs = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional().default("document"),
});

const searchArgs = z.object({ query: z.string().min(1) });

export interface ActionResult {
  toolCallId: string;
  toolName: string;
  ok: boolean;
  result: unknown;
  actionLogged?: { actionType: string; summary: string };
}

/**
 * The Action Engine is the ONLY place tool calls turn into database writes.
 * Every write is Zod-validated before touching a service, every write is
 * scoped to the authenticated user, and every write is logged to
 * agent_actions so it shows up in the Activity Timeline. Creating an
 * idea/memory/note/resource here also auto-updates the Knowledge Graph.
 */
export const actionEngine = {
  async execute(params: {
    userId: string;
    chatId: string;
    toolCallId: string;
    toolName: string;
    rawArgs: string;
  }): Promise<ActionResult> {
    const { userId, chatId, toolCallId, toolName, rawArgs } = params;

    let parsedArgs: unknown;
    try {
      parsedArgs = rawArgs ? JSON.parse(rawArgs) : {};
    } catch {
      return {
        toolCallId,
        toolName,
        ok: false,
        result: { error: "Malformed tool arguments returned by the model." },
      };
    }

    try {
      switch (toolName) {
        case "create_note": {
          const args = createNoteArgs.parse(parsedArgs);
          const note = await notesService.create(userId, args);
          const logged = await agentActionsService.log({
            userId,
            chatId,
            actionType: "create_note",
            entityType: "note",
            entityId: note.id,
            summary: `Created note "${note.title}"`,
            payload: note,
          });
          return { toolCallId, toolName, ok: true, result: note, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "create_idea": {
          const args = createIdeaArgs.parse(parsedArgs);
          const idea = await ideasService.create(userId, args);
          const logged = await agentActionsService.log({
            userId,
            chatId,
            actionType: "create_idea",
            entityType: "idea",
            entityId: idea.id,
            summary: `Created idea "${idea.title}"`,
            payload: idea,
          });
          return { toolCallId, toolName, ok: true, result: idea, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "create_memory": {
          const args = createMemoryArgs.parse(parsedArgs);
          const memory = await memoriesService.create(userId, args);
          const logged = await agentActionsService.log({
            userId,
            chatId,
            actionType: "create_memory",
            entityType: "memory",
            entityId: memory.id,
            summary: `Stored memory "${memory.title}"`,
            payload: memory,
          });
          return { toolCallId, toolName, ok: true, result: memory, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "create_resource": {
          const args = createResourceArgs.parse(parsedArgs);
          const resource = await resourcesService.create(userId, args);
          const logged = await agentActionsService.log({
            userId,
            chatId,
            actionType: "create_resource",
            entityType: "resource",
            entityId: resource.id,
            summary: `Saved resource "${resource.title}"`,
            payload: resource,
          });
          return { toolCallId, toolName, ok: true, result: resource, actionLogged: { actionType: logged.actionType, summary: logged.summary } };
        }
        case "search_knowledge": {
          const args = searchArgs.parse(parsedArgs);
          const results = await searchService.search(userId, args.query, 10);
          await agentActionsService.log({
            userId,
            chatId,
            actionType: "search",
            summary: `Searched for "${args.query}" (${results.length} results)`,
            payload: { query: args.query, resultCount: results.length },
          });
          return { toolCallId, toolName, ok: true, result: results };
        }
        case "get_recommendations": {
          const decisions = await decisionEngine.decide(userId);
          await agentActionsService.log({
            userId,
            chatId,
            actionType: "get_recommendations",
            summary: `Generated ${decisions.length} recommendation(s)`,
            payload: decisions,
          });
          return { toolCallId, toolName, ok: true, result: decisions };
        }
        default:
          return { toolCallId, toolName, ok: false, result: { error: `Unknown tool ${toolName}` } };
      }
    } catch (err) {
      logger.error({ err, toolName }, "Action engine failed to execute tool call");
      await agentActionsService
        .log({
          userId,
          chatId,
          actionType: toolName,
          summary: `Failed to execute ${toolName}`,
          status: "failed",
          payload: { error: err instanceof Error ? err.message : String(err) },
        })
        .catch(() => undefined);
      return {
        toolCallId,
        toolName,
        ok: false,
        result: { error: err instanceof Error ? err.message : "Action failed validation." },
      };
    }
  },
};
