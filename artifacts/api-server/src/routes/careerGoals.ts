import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { careerGoalService } from "../services/careerGoalService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateGoalBody = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  type: z.enum(["short_term", "long_term"]).optional().default("short_term"),
  targetCompanies: z.array(z.string()).optional().default([]),
  targetRoles: z.array(z.string()).optional().default([]),
  targetTechnologies: z.array(z.string()).optional().default([]),
  milestones: z.array(z.object({ title: z.string(), done: z.boolean() })).optional().default([]),
  progressPercent: z.number().int().min(0).max(100).optional().default(0),
  targetDate: z.string().optional(),
  status: z.enum(["active", "completed", "abandoned"]).optional().default("active"),
});
const UpdateGoalBody = CreateGoalBody.partial();
const IdParam = z.object({ id: z.string().uuid() });

router.get("/career-goals", async (req, res): Promise<void> => {
  res.json(await careerGoalService.list(req.auth!.userId));
});

router.post("/career-goals", async (req, res): Promise<void> => {
  const parsed = CreateGoalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const goal = await careerGoalService.create(req.auth!.userId, parsed.data);
  res.status(201).json(goal);
});

router.patch("/career-goals/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateGoalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const goal = await careerGoalService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!goal) { res.status(404).json({ error: "Career goal not found" }); return; }
  res.json(goal);
});

router.delete("/career-goals/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const goal = await careerGoalService.remove(req.auth!.userId, params.data.id);
  if (!goal) { res.status(404).json({ error: "Career goal not found" }); return; }
  res.sendStatus(204);
});

export default router;
