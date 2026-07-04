import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { automationRuleService, RuleEngine } from "../services/automationService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateRuleBody = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  trigger: z.object({ type: z.string(), params: z.record(z.string(), z.unknown()).optional().default({}) }),
  action: z.object({ type: z.string(), params: z.record(z.string(), z.unknown()).optional().default({}) }),
  isEnabled: z.boolean().optional().default(true),
});
const UpdateRuleBody = CreateRuleBody.partial().extend({ isBuiltIn: z.boolean().optional() });
const IdParam = z.object({ id: z.string().uuid() });

router.get("/automation-rules", async (req, res): Promise<void> => {
  const rules = await automationRuleService.list(req.auth!.userId);
  res.json(rules);
});

router.post("/automation-rules", async (req, res): Promise<void> => {
  const parsed = CreateRuleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const rule = await automationRuleService.create(req.auth!.userId, parsed.data);
  res.status(201).json(rule);
});

router.post("/automation-rules/seed", async (req, res): Promise<void> => {
  const rules = await automationRuleService.seedBuiltIns(req.auth!.userId);
  res.status(201).json(rules);
});

router.post("/automation-rules/run", async (req, res): Promise<void> => {
  const results = await RuleEngine.runAll(req.auth!.userId);
  res.json(results);
});

router.get("/automation-rules/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const rule = await automationRuleService.get(req.auth!.userId, params.data.id);
  if (!rule) { res.status(404).json({ error: "Automation rule not found" }); return; }
  res.json(rule);
});

router.patch("/automation-rules/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateRuleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const rule = await automationRuleService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!rule) { res.status(404).json({ error: "Automation rule not found" }); return; }
  res.json(rule);
});

router.delete("/automation-rules/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const rule = await automationRuleService.remove(req.auth!.userId, params.data.id);
  if (!rule) { res.status(404).json({ error: "Automation rule not found" }); return; }
  res.sendStatus(204);
});

export default router;
