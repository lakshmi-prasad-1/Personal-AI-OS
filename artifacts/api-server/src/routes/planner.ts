import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { plannerService } from "../services/plannerService";
import { dailyPlannerService } from "../services/dailyPlannerService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateEventBody = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  type: z.enum(["study", "project", "coding", "college", "break", "free", "buffer", "custom"]).optional().default("custom"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationMinutes: z.number().int().optional(),
  taskId: z.string().uuid().optional(),
  createdByAi: z.boolean().optional().default(false),
});

const UpdateEventBody = CreateEventBody.partial();
const IdParam = z.object({ id: z.string().uuid() });
const DateParam = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

router.get("/planner/day/:date", async (req, res): Promise<void> => {
  const params = DateParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid date (use YYYY-MM-DD)" }); return; }
  const events = await plannerService.getDay(req.auth!.userId, params.data.date);
  res.json(events);
});

router.get("/planner/week/:date", async (req, res): Promise<void> => {
  const params = DateParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid date (use YYYY-MM-DD)" }); return; }
  const events = await plannerService.getWeek(req.auth!.userId, params.data.date);
  res.json(events);
});

router.get("/planner/today", async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const events = await plannerService.getDay(req.auth!.userId, today);
  res.json(events);
});

router.post("/planner", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const event = await plannerService.create(req.auth!.userId, parsed.data);
  res.status(201).json(event);
});

router.get("/planner/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const event = await plannerService.get(req.auth!.userId, params.data.id);
  if (!event) { res.status(404).json({ error: "Planner event not found" }); return; }
  res.json(event);
});

router.patch("/planner/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const event = await plannerService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!event) { res.status(404).json({ error: "Planner event not found" }); return; }
  res.json(event);
});

router.post("/planner/:id/complete", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const event = await plannerService.complete(req.auth!.userId, params.data.id);
  if (!event) { res.status(404).json({ error: "Planner event not found" }); return; }
  res.json(event);
});

router.delete("/planner/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const event = await plannerService.remove(req.auth!.userId, params.data.id);
  if (!event) { res.status(404).json({ error: "Planner event not found" }); return; }
  res.sendStatus(204);
});

// ─── Phase 4, Modules 3-5: Smart Planner (auto-generate) ───────────────────
router.get("/planner/generate/daily", async (req, res): Promise<void> => {
  const params = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const date = params.data.date ?? new Date().toISOString().slice(0, 10);
  const events = await dailyPlannerService.generateDaily(req.auth!.userId, date);
  res.json({ date, events });
});

router.get("/planner/generate/weekly", async (req, res): Promise<void> => {
  const params = z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const weekStart = params.data.weekStart ?? new Date().toISOString().slice(0, 10);
  const byDay = await dailyPlannerService.generateWeekly(req.auth!.userId, weekStart);
  res.json(byDay);
});

router.get("/planner/generate/monthly", async (req, res): Promise<void> => {
  const params = z.object({ monthStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const monthStart = params.data.monthStart ?? new Date().toISOString().slice(0, 10);
  const weeks = await dailyPlannerService.generateMonthly(req.auth!.userId, monthStart);
  res.json(weeks);
});

export default router;
