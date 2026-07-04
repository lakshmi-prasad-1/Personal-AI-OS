import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { applicationService } from "../services/applicationService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateApplicationBody = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  appliedDate: z.string().optional().default(""),
  deadline: z.string().optional(),
  status: z.enum(["applied", "screening", "interview", "assessment", "offer", "rejected", "withdrawn"]).optional().default("applied"),
  jobUrl: z.string().optional(),
  jobDescription: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  salary: z.string().optional(),
  location: z.string().optional(),
  workType: z.enum(["remote", "hybrid", "onsite"]).optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  reminderDate: z.string().optional(),
});
const UpdateApplicationBody = CreateApplicationBody.partial();
const IdParam = z.object({ id: z.string().uuid() });

router.get("/applications", async (req, res): Promise<void> => {
  res.json(await applicationService.list(req.auth!.userId));
});

router.get("/applications/stats", async (req, res): Promise<void> => {
  res.json(await applicationService.stats(req.auth!.userId));
});

router.post("/applications", async (req, res): Promise<void> => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const app = await applicationService.create(req.auth!.userId, parsed.data);
  res.status(201).json(app);
});

router.get("/applications/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const app = await applicationService.get(req.auth!.userId, params.data.id);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }
  res.json(app);
});

router.patch("/applications/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateApplicationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const app = await applicationService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }
  res.json(app);
});

router.delete("/applications/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const app = await applicationService.remove(req.auth!.userId, params.data.id);
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }
  res.sendStatus(204);
});

export default router;
