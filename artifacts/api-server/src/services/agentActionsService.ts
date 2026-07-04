import { and, desc, eq } from "drizzle-orm";
import { db, agentActionsTable, type AgentAction } from "@workspace/db";

export interface LogActionInput {
  userId: string;
  chatId?: string | null;
  actionType: string;
  entityType?: string | null;
  entityId?: string | null;
  summary: string;
  status?: "success" | "failed";
  payload?: unknown;
}

export const agentActionsService = {
  async log(input: LogActionInput): Promise<AgentAction> {
    const [action] = await db
      .insert(agentActionsTable)
      .values({
        userId: input.userId,
        chatId: input.chatId ?? null,
        actionType: input.actionType,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        summary: input.summary,
        status: input.status ?? "success",
        payload: (input.payload as object | undefined) ?? null,
      })
      .returning();
    if (!action) throw new Error("Failed to log agent action");
    return action;
  },

  async recent(userId: string, limit = 20): Promise<AgentAction[]> {
    return db
      .select()
      .from(agentActionsTable)
      .where(eq(agentActionsTable.userId, userId))
      .orderBy(desc(agentActionsTable.createdAt))
      .limit(limit);
  },

  async byChat(userId: string, chatId: string): Promise<AgentAction[]> {
    return db
      .select()
      .from(agentActionsTable)
      .where(and(eq(agentActionsTable.userId, userId), eq(agentActionsTable.chatId, chatId)))
      .orderBy(desc(agentActionsTable.createdAt));
  },
};
