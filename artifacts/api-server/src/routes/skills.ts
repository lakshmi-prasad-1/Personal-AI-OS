import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { skillService } from "../services/skillService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateSkillBody = z.object({
  name: z.string().min(1),
  category: z.enum(["programming_language", "framework", "library", "database", "cloud", "devops", "ai_ml", "dsa", "system_design", "soft_skill", "other"]).optional().default("other"),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional().default("beginner"),
  confidence: z.number().int().min(0).max(100).optional().default(50),
  experience: z.string().optional().default(""),
  projectsUsed: z.array(z.string()).optional().default([]),
  learningProgress: z.number().int().min(0).max(100).optional().default(0),
  notes: z.string().optional().default(""),
});
const UpdateSkillBody = CreateSkillBody.partial();
const IdParam = z.object({ id: z.string().uuid() });

router.get("/skills", async (req, res): Promise<void> => {
  res.json(await skillService.list(req.auth!.userId));
});

router.get("/skills/stats", async (req, res): Promise<void> => {
  res.json(await skillService.stats(req.auth!.userId));
});

router.post("/skills", async (req, res): Promise<void> => {
  const parsed = CreateSkillBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const skill = await skillService.create(req.auth!.userId, parsed.data);
  res.status(201).json(skill);
});

router.patch("/skills/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateSkillBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const skill = await skillService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!skill) { res.status(404).json({ error: "Skill not found" }); return; }
  res.json(skill);
});

router.delete("/skills/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const skill = await skillService.remove(req.auth!.userId, params.data.id);
  if (!skill) { res.status(404).json({ error: "Skill not found" }); return; }
  res.sendStatus(204);
});

export default router;
