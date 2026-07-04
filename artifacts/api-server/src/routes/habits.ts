import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { habitService } from "../services/habitService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateHabitBody = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  category: z.string().optional().default("general"),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional().default("daily"),
  targetDays: z.array(z.number().int()).optional().default([]),
  targetCount: z.number().int().optional().default(1),
  isActive: z.boolean().optional().default(true),
});

const UpdateHabitBody = CreateHabitBody.partial();
const IdParam = z.object({ id: z.string().uuid() });
const LogBody = z.object({
  completed: z.boolean().optional().default(true),
  notes: z.string().optional(),
});

router.get("/habits", async (req, res): Promise<void> => {
  const habits = await habitService.list(req.auth!.userId);
  res.json(habits);
});

router.get("/habits/today", async (req, res): Promise<void> => {
  const status = await habitService.getTodayStatus(req.auth!.userId);
  res.json(status);
});

router.get("/habits/stats", async (req, res): Promise<void> => {
  const stats = await habitService.stats(req.auth!.userId);
  res.json(stats);
});

router.post("/habits", async (req, res): Promise<void> => {
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const habit = await habitService.create(req.auth!.userId, parsed.data);
  res.status(201).json(habit);
});

router.get("/habits/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const habit = await habitService.get(req.auth!.userId, params.data.id);
  if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
  res.json(habit);
});

router.get("/habits/:id/logs", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const logs = await habitService.getLogs(req.auth!.userId, params.data.id);
  res.json(logs);
});

router.patch("/habits/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateHabitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const habit = await habitService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
  res.json(habit);
});

router.post("/habits/:id/log", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = LogBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const log = await habitService.logToday(req.auth!.userId, params.data.id, parsed.data.completed, parsed.data.notes);
  res.status(201).json(log);
});

router.delete("/habits/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const habit = await habitService.remove(req.auth!.userId, params.data.id);
  if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
  res.sendStatus(204);
});

export default router;
