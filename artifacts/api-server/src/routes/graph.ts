import { Router, type IRouter } from "express";
import { knowledgeGraphService } from "../services/knowledgeGraphService";
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
  const graph = await knowledgeGraphService.getAll(req.auth!.userId);
  res.json(GetGraphResponse.parse(graph));
});

router.post("/graph/nodes", async (req, res): Promise<void> => {
  const parsed = CreateGraphNodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const node = await knowledgeGraphService.createNode(req.auth!.userId, parsed.data);
  res.status(201).json(CreateGraphNodeResponse.parse(node));
});

router.post("/graph/edges", async (req, res): Promise<void> => {
  const parsed = CreateGraphEdgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const edge = await knowledgeGraphService.createEdge(req.auth!.userId, parsed.data);
  res.status(201).json(CreateGraphEdgeResponse.parse(edge));
});

export default router;
