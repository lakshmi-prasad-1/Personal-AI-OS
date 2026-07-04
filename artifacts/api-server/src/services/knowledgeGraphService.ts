import { eq } from "drizzle-orm";
import { db, graphNodesTable, graphEdgesTable, type GraphNode, type GraphEdge } from "@workspace/db";

export type LinkableEntityType =
  | "note"
  | "idea"
  | "memory"
  | "resource"
  | "subject"
  | "topic"
  | "flashcard"
  | "quiz"
  | "skill"
  | "project"
  | "resume"
  | "career_goal"
  | "interview_topic"
  | "job_application"
  | "company";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const word of a) {
    if (b.has(word)) shared += 1;
  }
  return shared;
}

export const knowledgeGraphService = {
  async getAll(userId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const [nodes, edges] = await Promise.all([
      db.select().from(graphNodesTable).where(eq(graphNodesTable.userId, userId)),
      db.select().from(graphEdgesTable).where(eq(graphEdgesTable.userId, userId)),
    ]);
    return { nodes, edges };
  },

  /**
   * Auto-creates a node for a newly created (or updated) entity and links it to
   * other existing nodes that share vocabulary (tags/title/content keywords).
   * This is what turns manual graph CRUD into an automatically maintained graph.
   */
  async autoLink(params: {
    userId: string;
    entityType: LinkableEntityType;
    entityId: string;
    label: string;
    text: string;
    tags?: string[];
  }): Promise<{ node: GraphNode; edges: GraphEdge[] }> {
    const { userId, entityType, entityId, label, text, tags = [] } = params;

    const [existingNodes, existingEdges] = await Promise.all([
      db.select().from(graphNodesTable).where(eq(graphNodesTable.userId, userId)),
      db.select().from(graphEdgesTable).where(eq(graphEdgesTable.userId, userId)),
    ]);

    let node = existingNodes.find((n) => n.entityType === entityType && n.entityId === entityId);
    if (!node) {
      const [created] = await db.insert(graphNodesTable).values({ userId, entityType, entityId, label }).returning();
      if (!created) throw new Error("Failed to create graph node");
      node = created;
    }

    const newNodeTokens = new Set([...tokenize(text), ...tags.map((t) => t.toLowerCase())]);
    const createdEdges: GraphEdge[] = [];

    for (const candidate of existingNodes) {
      if (candidate.id === node.id) continue;
      const candidateTokens = tokenize(candidate.label);
      const score = overlapScore(newNodeTokens, candidateTokens);
      if (score < 2) continue;

      const alreadyLinked = existingEdges.some(
        (e) =>
          (e.sourceNodeId === node!.id && e.targetNodeId === candidate.id) ||
          (e.sourceNodeId === candidate.id && e.targetNodeId === node!.id),
      );
      if (alreadyLinked) continue;

      const [edge] = await db
        .insert(graphEdgesTable)
        .values({
          userId,
          sourceNodeId: node.id,
          targetNodeId: candidate.id,
          relationshipType: "related_topic",
          weight: Math.min(score / 5, 1),
        })
        .returning();
      if (edge) createdEdges.push(edge);
    }

    return { node, edges: createdEdges };
  },

  async createNode(userId: string, data: { entityType: string; entityId: string; label: string }): Promise<GraphNode> {
    const [node] = await db
      .insert(graphNodesTable)
      .values({ ...data, userId })
      .returning();
    if (!node) throw new Error("Failed to create graph node");
    return node;
  },

  async createEdge(
    userId: string,
    data: { sourceNodeId: string; targetNodeId: string; relationshipType: string; weight?: number },
  ): Promise<GraphEdge> {
    const [edge] = await db
      .insert(graphEdgesTable)
      .values({ ...data, userId })
      .returning();
    if (!edge) throw new Error("Failed to create graph edge");
    return edge;
  },

  async stats(userId: string): Promise<{ nodeCount: number; edgeCount: number; byType: Record<string, number> }> {
    const { nodes, edges } = await this.getAll(userId);
    const byType: Record<string, number> = {};
    for (const node of nodes) {
      byType[node.entityType] = (byType[node.entityType] ?? 0) + 1;
    }
    return { nodeCount: nodes.length, edgeCount: edges.length, byType };
  },
};
