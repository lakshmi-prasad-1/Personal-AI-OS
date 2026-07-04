import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { quizService } from "../services/quizService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const GenerateBody = z.object({
  topic: z.string().min(1),
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  sourceText: z.string().optional(),
  count: z.number().int().min(1).max(20).optional().default(5),
  difficulty: z.enum(["easy", "medium", "hard", "adaptive"]).optional().default("medium"),
  types: z.array(z.string()).optional().default(["mcq"]),
});

const SubmitBody = z.object({
  answers: z.array(z.object({ questionId: z.string(), answer: z.string() })),
  timeSpentSeconds: z.number().int().optional(),
});

const IdParam = z.object({ id: z.string().uuid() });

router.get("/quizzes", async (req, res): Promise<void> => {
  const subjectId = typeof req.query["subjectId"] === "string" ? req.query["subjectId"] : undefined;
  const topicId = typeof req.query["topicId"] === "string" ? req.query["topicId"] : undefined;
  res.json(await quizService.list(req.auth!.userId, { subjectId, topicId }));
});

router.get("/quizzes/stats", async (req, res): Promise<void> => {
  res.json(await quizService.stats(req.auth!.userId));
});

router.post("/quizzes/generate", async (req, res): Promise<void> => {
  const parsed = GenerateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const questions = await quizService.generateWithAi(parsed.data);
  const quiz = await quizService.create(req.auth!.userId, {
    title: `Quiz: ${parsed.data.topic}`,
    subjectId: parsed.data.subjectId,
    topicId: parsed.data.topicId,
    questions,
    difficulty: parsed.data.difficulty,
    source: "ai",
  });
  res.status(201).json(quiz);
});

router.get("/quizzes/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const quiz = await quizService.get(req.auth!.userId, params.data.id);
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  res.json(quiz);
});

router.get("/quizzes/:id/attempts", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  res.json(await quizService.listAttempts(req.auth!.userId, params.data.id));
});

router.post("/quizzes/:id/attempts", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const attempt = await quizService.submitAttempt(req.auth!.userId, params.data.id, parsed.data.answers, parsed.data.timeSpentSeconds);
  if (!attempt) { res.status(404).json({ error: "Quiz not found" }); return; }
  res.status(201).json(attempt);
});

router.delete("/quizzes/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const quiz = await quizService.remove(req.auth!.userId, params.data.id);
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  res.sendStatus(204);
});

export default router;
