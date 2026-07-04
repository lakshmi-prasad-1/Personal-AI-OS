import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { resumeService } from "../services/resumeService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateResumeBody = z.object({
  title: z.string().min(1),
  category: z.enum(["general", "frontend", "backend", "ai", "full_stack"]).optional().default("general"),
  version: z.number().int().optional().default(1),
  content: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  isActive: z.enum(["true", "false"]).optional().default("true"),
});
const UpdateResumeBody = CreateResumeBody.partial();
const IdParam = z.object({ id: z.string().uuid() });

router.get("/resumes", async (req, res): Promise<void> => {
  res.json(await resumeService.list(req.auth!.userId));
});

router.post("/resumes", async (req, res): Promise<void> => {
  const parsed = CreateResumeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const resume = await resumeService.create(req.auth!.userId, parsed.data);
  res.status(201).json(resume);
});

router.get("/resumes/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const resume = await resumeService.get(req.auth!.userId, params.data.id);
  if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }
  res.json(resume);
});

router.patch("/resumes/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateResumeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const resume = await resumeService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }
  res.json(resume);
});

router.delete("/resumes/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const resume = await resumeService.remove(req.auth!.userId, params.data.id);
  if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }
  res.sendStatus(204);
});

router.post("/resumes/:id/analyze", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const resume = await resumeService.analyze(req.auth!.userId, params.data.id);
  if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }
  res.json(resume);
});

export default router;
