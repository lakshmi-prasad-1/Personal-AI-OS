import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { projectService } from "../services/projectService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateProjectBody = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  techStack: z.array(z.string()).optional().default([]),
  githubUrl: z.string().optional(),
  demoUrl: z.string().optional(),
  status: z.enum(["planning", "in_progress", "completed", "archived"]).optional().default("in_progress"),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  role: z.string().optional().default(""),
  achievements: z.array(z.string()).optional().default([]),
  challenges: z.string().optional().default(""),
  lessonsLearned: z.string().optional().default(""),
  skillsUsed: z.array(z.string()).optional().default([]),
  usedInResume: z.enum(["true", "false"]).optional().default("false"),
});
const UpdateProjectBody = CreateProjectBody.partial();
const IdParam = z.object({ id: z.string().uuid() });

router.get("/projects", async (req, res): Promise<void> => {
  res.json(await projectService.list(req.auth!.userId));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const project = await projectService.create(req.auth!.userId, parsed.data);
  res.status(201).json(project);
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const project = await projectService.get(req.auth!.userId, params.data.id);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(project);
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const project = await projectService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(project);
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const project = await projectService.remove(req.auth!.userId, params.data.id);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.sendStatus(204);
});

export default router;
