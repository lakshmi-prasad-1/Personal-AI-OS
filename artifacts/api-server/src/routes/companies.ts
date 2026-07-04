import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { companyService } from "../services/companyService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateCompanyBody = z.object({
  name: z.string().min(1),
  website: z.string().optional(),
  careerPage: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  location: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "dream"]).optional().default("medium"),
  hiringProcess: z.string().optional().default(""),
  interviewRounds: z.number().int().optional(),
  culture: z.string().optional().default(""),
  benefits: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  status: z.enum(["researching", "applied", "interviewing", "offer", "rejected", "not_interested"]).optional().default("researching"),
  aiSummary: z.string().optional(),
});
const UpdateCompanyBody = CreateCompanyBody.partial();
const IdParam = z.object({ id: z.string().uuid() });

router.get("/companies", async (req, res): Promise<void> => {
  res.json(await companyService.list(req.auth!.userId));
});

router.post("/companies", async (req, res): Promise<void> => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const company = await companyService.create(req.auth!.userId, parsed.data);
  res.status(201).json(company);
});

router.get("/companies/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const company = await companyService.get(req.auth!.userId, params.data.id);
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }
  res.json(company);
});

router.patch("/companies/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const company = await companyService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }
  res.json(company);
});

router.delete("/companies/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const company = await companyService.remove(req.auth!.userId, params.data.id);
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }
  res.sendStatus(204);
});

export default router;
