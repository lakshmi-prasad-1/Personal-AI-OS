import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { revisionService } from "../services/revisionService";
import { studyAnalyticsService } from "../services/studyAnalyticsService";
import { teacherService } from "../services/teacherService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const LogSessionBody = z.object({
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  type: z.enum(["daily", "weekly", "monthly", "exam", "forgotten", "weak", "random", "priority"]).optional().default("daily"),
  itemsReviewed: z.number().int().optional().default(0),
  notes: z.string().optional().default(""),
});

const StudySessionBody = z.object({
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  durationMinutes: z.number().int().min(1),
  type: z.enum(["study", "revision", "practice", "coding"]).optional().default("study"),
  notes: z.string().optional().default(""),
  date: z.string().optional(),
});

const ExplainBody = z.object({
  topic: z.string().min(1),
  mode: z.enum(["simple", "deep", "examples", "interview", "coding", "exam", "step_by_step", "compare", "analogy", "default"]).optional().default("default"),
  context: z.string().optional(),
});

router.get("/revision/today", async (req, res): Promise<void> => {
  res.json(await revisionService.recommendToday(req.auth!.userId));
});

router.get("/revision/sessions", async (req, res): Promise<void> => {
  res.json(await revisionService.list(req.auth!.userId));
});

router.post("/revision/sessions", async (req, res): Promise<void> => {
  const parsed = LogSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const session = await revisionService.logSession(req.auth!.userId, parsed.data);
  res.status(201).json(session);
});

router.get("/revision/weak-topics", async (req, res): Promise<void> => {
  res.json(await revisionService.listWeakTopics(req.auth!.userId));
});

router.post("/revision/weak-topics/:id/resolve", async (req, res): Promise<void> => {
  const id = req.params["id"];
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const resolved = await revisionService.resolveWeakTopic(req.auth!.userId, id);
  if (!resolved) { res.status(404).json({ error: "Weak topic not found" }); return; }
  res.json(resolved);
});

router.post("/study-sessions", async (req, res): Promise<void> => {
  const parsed = StudySessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
  const session = await studyAnalyticsService.logSession(req.auth!.userId, { ...parsed.data, date });
  res.status(201).json(session);
});

router.get("/study-analytics/overview", async (req, res): Promise<void> => {
  res.json(await studyAnalyticsService.progressOverview(req.auth!.userId));
});

router.post("/teacher/explain", async (req, res): Promise<void> => {
  const parsed = ExplainBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const explanation = await teacherService.explain(parsed.data);
  res.json({ explanation });
});

export default router;
