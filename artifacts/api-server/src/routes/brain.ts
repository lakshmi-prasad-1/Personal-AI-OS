import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { decisionEngine } from "../ai/decisionEngine";
import { searchService } from "../services/searchService";
import { agentActionsService } from "../services/agentActionsService";
import { knowledgeGraphService } from "../services/knowledgeGraphService";
import { BrainDecideResponse, BrainSearchBody, BrainSearchResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.post("/brain/decide", async (req, res): Promise<void> => {
  const decisions = await decisionEngine.decide(req.auth!.userId);
  res.json(BrainDecideResponse.parse({ decisions }));
});

router.post("/brain/search", async (req, res): Promise<void> => {
  const parsed = BrainSearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, limit } = parsed.data;
  const results = await searchService.search(req.auth!.userId, query, limit ?? 20);

  res.json(
    BrainSearchResponse.parse({
      query,
      results: results.map(({ id, title, type, snippet }) => ({ id, title, type, snippet })),
    }),
  );
});

const activityQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() });

router.get("/brain/activity", async (req, res): Promise<void> => {
  const parsed = activityQuery.safeParse(req.query);
  const limit = parsed.success ? parsed.data.limit ?? 20 : 20;
  const actions = await agentActionsService.recent(req.auth!.userId, limit);
  res.json({ actions });
});

router.get("/brain/knowledge-stats", async (req, res): Promise<void> => {
  const stats = await knowledgeGraphService.stats(req.auth!.userId);
  res.json(stats);
});

export default router;
