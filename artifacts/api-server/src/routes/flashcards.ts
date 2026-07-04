import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { flashcardService } from "../services/flashcardService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateFlashcardBody = z.object({
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  resourceId: z.string().uuid().optional(),
  front: z.string().min(1),
  back: z.string().min(1),
  type: z.enum(["definition", "concept", "formula", "programming", "revision"]).optional().default("concept"),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  source: z.enum(["manual", "ai"]).optional().default("manual"),
});
const UpdateFlashcardBody = CreateFlashcardBody.partial();

const GenerateBody = z.object({
  topic: z.string().min(1),
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  sourceText: z.string().optional(),
  count: z.number().int().min(1).max(20).optional().default(5),
  type: z.enum(["definition", "concept", "formula", "programming", "revision"]).optional().default("concept"),
});

const ReviewBody = z.object({ rating: z.enum(["again", "hard", "good", "easy"]) });
const IdParam = z.object({ id: z.string().uuid() });

router.get("/flashcards", async (req, res): Promise<void> => {
  const subjectId = typeof req.query["subjectId"] === "string" ? req.query["subjectId"] : undefined;
  const topicId = typeof req.query["topicId"] === "string" ? req.query["topicId"] : undefined;
  res.json(await flashcardService.list(req.auth!.userId, { subjectId, topicId }));
});

router.get("/flashcards/due", async (req, res): Promise<void> => {
  res.json(await flashcardService.due(req.auth!.userId));
});

router.get("/flashcards/stats", async (req, res): Promise<void> => {
  res.json(await flashcardService.stats(req.auth!.userId));
});

router.post("/flashcards", async (req, res): Promise<void> => {
  const parsed = CreateFlashcardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const card = await flashcardService.create(req.auth!.userId, parsed.data);
  res.status(201).json(card);
});

router.post("/flashcards/generate", async (req, res): Promise<void> => {
  const parsed = GenerateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const generated = await flashcardService.generateWithAi(parsed.data);
  const created = await flashcardService.createMany(
    req.auth!.userId,
    generated.map((c) => ({ ...c, subjectId: parsed.data.subjectId, topicId: parsed.data.topicId, source: "ai" as const })),
  );
  res.status(201).json(created);
});

router.patch("/flashcards/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateFlashcardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const card = await flashcardService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!card) { res.status(404).json({ error: "Flashcard not found" }); return; }
  res.json(card);
});

router.post("/flashcards/:id/review", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = ReviewBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const result = await flashcardService.review(req.auth!.userId, params.data.id, parsed.data.rating);
  if (!result) { res.status(404).json({ error: "Flashcard not found" }); return; }
  res.json(result);
});

router.delete("/flashcards/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const card = await flashcardService.remove(req.auth!.userId, params.data.id);
  if (!card) { res.status(404).json({ error: "Flashcard not found" }); return; }
  res.sendStatus(204);
});

export default router;
