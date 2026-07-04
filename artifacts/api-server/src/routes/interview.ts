import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { interviewService } from "../services/interviewService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateTopicBody = z.object({
  title: z.string().min(1),
  category: z.enum(["coding", "behavioral", "hr", "system_design"]).optional().default("coding"),
  question: z.string().optional().default(""),
  idealAnswerNotes: z.string().optional().default(""),
  revisionStatus: z.enum(["not_started", "in_progress", "mastered"]).optional().default("not_started"),
  confidenceScore: z.number().int().min(0).max(100).optional().default(0),
  source: z.enum(["manual", "ai"]).optional().default("manual"),
});
const UpdateTopicBody = CreateTopicBody.partial();
const IdParam = z.object({ id: z.string().uuid() });

router.get("/interview/topics", async (req, res): Promise<void> => {
  res.json(await interviewService.listTopics(req.auth!.userId));
});

router.post("/interview/topics", async (req, res): Promise<void> => {
  const parsed = CreateTopicBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const topic = await interviewService.createTopic(req.auth!.userId, parsed.data);
  res.status(201).json(topic);
});

router.post("/interview/topics/generate", async (req, res): Promise<void> => {
  const body = z.object({ category: z.enum(["coding", "behavioral", "hr", "system_design"]), count: z.number().int().min(1).max(10).optional() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const topics = await interviewService.generateTopics(req.auth!.userId, body.data.category, body.data.count);
  res.status(201).json(topics);
});

router.patch("/interview/topics/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateTopicBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const topic = await interviewService.updateTopic(req.auth!.userId, params.data.id, parsed.data);
  if (!topic) { res.status(404).json({ error: "Interview topic not found" }); return; }
  res.json(topic);
});

router.delete("/interview/topics/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const topic = await interviewService.removeTopic(req.auth!.userId, params.data.id);
  if (!topic) { res.status(404).json({ error: "Interview topic not found" }); return; }
  res.sendStatus(204);
});

router.get("/interview/sessions", async (req, res): Promise<void> => {
  res.json(await interviewService.listSessions(req.auth!.userId));
});

router.post("/interview/question", async (req, res): Promise<void> => {
  const body = z.object({ type: z.enum(["technical", "behavioral", "hr", "coding", "project_discussion", "resume_discussion"]) }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  res.json({ question: await interviewService.generateQuestion(body.data.type) });
});

router.post("/interview/evaluate", async (req, res): Promise<void> => {
  const body = z.object({ type: z.string(), question: z.string(), answer: z.string() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  res.json(await interviewService.evaluateAnswer(body.data.type, body.data.question, body.data.answer));
});

router.post("/interview/sessions", async (req, res): Promise<void> => {
  const body = z
    .object({
      type: z.enum(["technical", "behavioral", "hr", "coding", "project_discussion", "resume_discussion"]),
      questions: z.array(z.object({ question: z.string(), answer: z.string(), feedback: z.string(), score: z.number() })),
    })
    .safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const session = await interviewService.saveSession(req.auth!.userId, body.data.type, body.data.questions);
  res.status(201).json(session);
});

router.get("/interview/stats", async (req, res): Promise<void> => {
  res.json(await interviewService.stats(req.auth!.userId));
});

export default router;
