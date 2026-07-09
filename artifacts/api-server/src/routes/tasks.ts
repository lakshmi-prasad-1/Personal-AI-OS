import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { taskService } from "../services/taskService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateTaskBody = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  category: z.string().optional().default("general"),
  status: z.enum(["todo", "in_progress", "done", "archived"]).optional().default("todo"),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  estimatedMinutes: z.number().int().optional(),
  tags: z.array(z.string()).optional().default([]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  parentId: z.string().uuid().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: z.string().optional(),
  recurringDays: z.array(z.number()).optional().default([]),
  dependsOn: z.array(z.string()).optional().default([]),
  createdByAi: z.boolean().optional().default(false),
  aiSummary: z.string().optional(),
});

const UpdateTaskBody = CreateTaskBody.partial();
const IdParam = z.object({ id: z.string().uuid() });
const FilterQuery = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
});

router.get("/tasks", async (req, res): Promise<void> => {
  const query = FilterQuery.safeParse(req.query);
  const tasks = await taskService.list(req.auth!.userId, query.success ? query.data : undefined);
  res.json(tasks);
});

router.get("/tasks/today", async (req, res): Promise<void> => {
  // Return all tasks due today (all statuses) so frontend can compute done/pending counts.
  // Accept an optional ?date=YYYY-MM-DD (the client's local date) so "today" matches the
  // user's timezone instead of the server's UTC date — otherwise tasks created near
  // midnight can silently disappear from the dashboard.
  const all = await taskService.list(req.auth!.userId, {});
  const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
  const today = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);
  const todayAll = all.filter((t) => t.dueDate === today);
  res.json(todayAll);
});

router.get("/tasks/upcoming", async (req, res): Promise<void> => {
  const tasks = await taskService.listUpcoming(req.auth!.userId);
  res.json(tasks);
});

router.get("/tasks/stats", async (req, res): Promise<void> => {
  const stats = await taskService.stats(req.auth!.userId);
  res.json(stats);
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const task = await taskService.create(req.auth!.userId, parsed.data);
  res.status(201).json(task);
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const task = await taskService.get(req.auth!.userId, params.data.id);
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(task);
});

router.get("/tasks/:id/subtasks", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const subtasks = await taskService.listSubtasks(req.auth!.userId, params.data.id);
  res.json(subtasks);
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const task = await taskService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(task);
});

router.post("/tasks/:id/complete", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const task = await taskService.complete(req.auth!.userId, params.data.id);
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(task);
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const task = await taskService.remove(req.auth!.userId, params.data.id);
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.sendStatus(204);
});

export default router;
