import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { reminderService } from "../services/reminderService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const CreateReminderBody = z.object({
  title: z.string().min(1),
  body: z.string().optional().default(""),
  remindAt: z.string().datetime(),
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurringDays: z.array(z.number().int()).optional().default([]),
  createdByAi: z.boolean().optional().default(false),
});

const UpdateReminderBody = CreateReminderBody.partial();
const IdParam = z.object({ id: z.string().uuid() });
const SnoozeBody = z.object({ until: z.string().datetime() });

router.get("/reminders", async (req, res): Promise<void> => {
  const reminders = await reminderService.list(req.auth!.userId);
  res.json(reminders);
});

router.get("/reminders/upcoming", async (req, res): Promise<void> => {
  const reminders = await reminderService.upcoming(req.auth!.userId);
  res.json(reminders);
});

router.get("/reminders/due", async (req, res): Promise<void> => {
  const reminders = await reminderService.due(req.auth!.userId);
  res.json(reminders);
});

router.post("/reminders", async (req, res): Promise<void> => {
  const parsed = CreateReminderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const reminder = await reminderService.create(req.auth!.userId, {
    ...parsed.data,
    remindAt: new Date(parsed.data.remindAt),
  });
  res.status(201).json(reminder);
});

router.get("/reminders/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const reminder = await reminderService.get(req.auth!.userId, params.data.id);
  if (!reminder) { res.status(404).json({ error: "Reminder not found" }); return; }
  res.json(reminder);
});

router.patch("/reminders/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateReminderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: any = { ...parsed.data };
  if (data.remindAt) data.remindAt = new Date(data.remindAt);
  const reminder = await reminderService.update(req.auth!.userId, params.data.id, data);
  if (!reminder) { res.status(404).json({ error: "Reminder not found" }); return; }
  res.json(reminder);
});

router.post("/reminders/:id/complete", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const reminder = await reminderService.complete(req.auth!.userId, params.data.id);
  if (!reminder) { res.status(404).json({ error: "Reminder not found" }); return; }
  res.json(reminder);
});

router.post("/reminders/:id/snooze", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = SnoozeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const reminder = await reminderService.snooze(req.auth!.userId, params.data.id, new Date(parsed.data.until));
  if (!reminder) { res.status(404).json({ error: "Reminder not found" }); return; }
  res.json(reminder);
});

router.delete("/reminders/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const reminder = await reminderService.remove(req.auth!.userId, params.data.id);
  if (!reminder) { res.status(404).json({ error: "Reminder not found" }); return; }
  res.sendStatus(204);
});

export default router;
