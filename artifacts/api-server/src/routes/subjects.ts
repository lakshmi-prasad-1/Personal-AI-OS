import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { subjectService } from "../services/subjectService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateSubjectBody = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  semester: z.string().optional(),
  credits: z.number().int().optional(),
  category: z.enum(["core", "elective", "lab", "project"]).optional().default("core"),
  examDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  isActive: z.enum(["true", "false"]).optional().default("true"),
});
const UpdateSubjectBody = CreateSubjectBody.partial();

const CreateTopicBody = z.object({
  subjectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  status: z.enum(["not_started", "in_progress", "completed", "revision_needed"]).optional().default("not_started"),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  importance: z.enum(["low", "medium", "high"]).optional().default("medium"),
  estimatedHours: z.number().int().optional(),
});
const UpdateTopicBody = CreateTopicBody.partial().omit({ subjectId: true });

const IdParam = z.object({ id: z.string().uuid() });

router.get("/subjects", async (req, res): Promise<void> => {
  res.json(await subjectService.list(req.auth!.userId));
});

router.get("/subjects/stats", async (req, res): Promise<void> => {
  res.json(await subjectService.stats(req.auth!.userId));
});

router.post("/subjects", async (req, res): Promise<void> => {
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const subject = await subjectService.create(req.auth!.userId, parsed.data);
  res.status(201).json(subject);
});

router.get("/subjects/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const subject = await subjectService.get(req.auth!.userId, params.data.id);
  if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
  res.json(subject);
});

router.patch("/subjects/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const subject = await subjectService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
  res.json(subject);
});

router.delete("/subjects/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const subject = await subjectService.remove(req.auth!.userId, params.data.id);
  if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
  res.sendStatus(204);
});

// ─── Topics ───────────────────────────────────────────────────────────────
router.get("/topics", async (req, res): Promise<void> => {
  const subjectId = typeof req.query["subjectId"] === "string" ? req.query["subjectId"] : undefined;
  res.json(await subjectService.listTopics(req.auth!.userId, subjectId));
});

router.post("/topics", async (req, res): Promise<void> => {
  const parsed = CreateTopicBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const topic = await subjectService.createTopic(req.auth!.userId, parsed.data);
  res.status(201).json(topic);
});

router.patch("/topics/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateTopicBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const topic = await subjectService.updateTopic(req.auth!.userId, params.data.id, parsed.data);
  if (!topic) { res.status(404).json({ error: "Topic not found" }); return; }
  res.json(topic);
});

router.delete("/topics/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const topic = await subjectService.removeTopic(req.auth!.userId, params.data.id);
  if (!topic) { res.status(404).json({ error: "Topic not found" }); return; }
  res.sendStatus(204);
});

export default router;
