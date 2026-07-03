import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, graphNodesTable, graphEdgesTable } from "@workspace/db";
import {
  GetGraphResponse,
  CreateGraphNodeBody,
  CreateGraphNodeResponse,
  CreateGraphEdgeBody,
  CreateGraphEdgeResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/graph", async (req, res): Promise<void> => {
  const [nodes, edges] = await Promise.all([
    db.select().from(graphNodesTable).where(eq(graphNodesTable.userId, req.auth!.userId)),
    db.select().from(graphEdgesTable).where(eq(graphEdgesTable.userId, req.auth!.userId)),
  ]);

  res.json(GetGraphResponse.parse({ nodes, edges }));
});

router.post("/graph/nodes", async (req, res): Promise<void> => {
  const parsed = CreateGraphNodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [node] = await db
    .insert(graphNodesTable)
    .values({ ...parsed.data, userId: req.auth!.userId })
    .returning();

  res.status(201).json(CreateGraphNodeResponse.parse(node));
});

router.post("/graph/edges", async (req, res): Promise<void> => {
  const parsed = CreateGraphEdgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [edge] = await db
    .insert(graphEdgesTable)
    .values({ ...parsed.data, userId: req.auth!.userId })
    .returning();

  res.status(201).json(CreateGraphEdgeResponse.parse(edge));
});

export default router;
