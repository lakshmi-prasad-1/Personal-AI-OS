import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { goalService } from "../services/goalService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateGoalBody = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  category: z.string().optional().default("personal"),
  type: z.enum(["short_term", "long_term"]).optional().default("long_term"),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  status: z.enum(["active", "completed", "paused", "abandoned"]).optional().default("active"),
  progressPercent: z.number().int().min(0).max(100).optional().default(0),
  targetDate: z.string().optional(),
  milestones: z.array(z.any()).optional().default([]),
});

const UpdateGoalBody = CreateGoalBody.partial();
const IdParam = z.object({ id: z.string().uuid() });
const ProgressBody = z.object({ progressPercent: z.number().int().min(0).max(100) });

router.get("/goals", async (req, res): Promise<void> => {
  const goals = await goalService.list(req.auth!.userId);
  res.json(goals);
});

router.get("/goals/stats", async (req, res): Promise<void> => {
  const stats = await goalService.stats(req.auth!.userId);
  res.json(stats);
});

router.post("/goals", async (req, res): Promise<void> => {
  const parsed = CreateGoalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const goal = await goalService.create(req.auth!.userId, parsed.data);
  res.status(201).json(goal);
});

router.get("/goals/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const goal = await goalService.get(req.auth!.userId, params.data.id);
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
  res.json(goal);
});

router.patch("/goals/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateGoalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const goal = await goalService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
  res.json(goal);
});

router.post("/goals/:id/complete", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const goal = await goalService.complete(req.auth!.userId, params.data.id);
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
  res.json(goal);
});

router.patch("/goals/:id/progress", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = ProgressBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const goal = await goalService.updateProgress(req.auth!.userId, params.data.id, parsed.data.progressPercent);
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
  res.json(goal);
});

router.delete("/goals/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const goal = await goalService.remove(req.auth!.userId, params.data.id);
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
  res.sendStatus(204);
});

export default router;
