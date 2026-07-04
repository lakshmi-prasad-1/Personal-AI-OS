import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { focusService } from "../services/focusService";
import { agentActionsService } from "../services/agentActionsService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateSessionBody = z.object({
  title: z.string().optional().default("Focus Session"),
  type: z.enum(["pomodoro", "deep_work", "study", "coding"]).optional().default("pomodoro"),
  plannedMinutes: z.number().int().min(1).max(180).optional().default(25),
  breakMinutes: z.number().int().optional().default(5),
  longBreakMinutes: z.number().int().optional().default(15),
  taskId: z.string().uuid().optional(),
  notes: z.string().optional().default(""),
});

const StopBody = z.object({ notes: z.string().optional() });
const IdParam = z.object({ id: z.string().uuid() });

router.get("/focus", async (req, res): Promise<void> => {
  const sessions = await focusService.list(req.auth!.userId);
  res.json(sessions);
});

router.get("/focus/active", async (req, res): Promise<void> => {
  const session = await focusService.getActive(req.auth!.userId);
  res.json(session ?? null);
});

router.get("/focus/stats", async (req, res): Promise<void> => {
  const stats = await focusService.todayStats(req.auth!.userId);
  res.json(stats);
});

router.post("/focus", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const session = await focusService.create(req.auth!.userId, parsed.data);
  res.status(201).json(session);
});

router.get("/focus/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const session = await focusService.get(req.auth!.userId, params.data.id);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(session);
});

router.post("/focus/:id/start", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const session = await focusService.start(req.auth!.userId, params.data.id);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  await agentActionsService.log({ userId: req.auth!.userId, actionType: "focus_start", entityType: "focus_session", entityId: session.id, summary: `Started ${session.type} session: "${session.title}"` });
  res.json(session);
});

router.post("/focus/:id/pause", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const session = await focusService.pause(req.auth!.userId, params.data.id);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  await agentActionsService.log({ userId: req.auth!.userId, actionType: "focus_pause", entityType: "focus_session", entityId: session.id, summary: `Paused focus session: "${session.title}"` });
  res.json(session);
});

router.post("/focus/:id/resume", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const session = await focusService.resume(req.auth!.userId, params.data.id);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(session);
});

router.post("/focus/:id/stop", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = StopBody.safeParse(req.body);
  const session = await focusService.stop(req.auth!.userId, params.data.id, parsed.success ? parsed.data.notes : undefined);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  await agentActionsService.log({ userId: req.auth!.userId, actionType: "focus_complete", entityType: "focus_session", entityId: session.id, summary: `Completed ${session.actualMinutes ?? 0}min focus session: "${session.title}"` });
  res.json(session);
});

router.delete("/focus/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const session = await focusService.cancel(req.auth!.userId, params.data.id);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.sendStatus(204);
});

export default router;
