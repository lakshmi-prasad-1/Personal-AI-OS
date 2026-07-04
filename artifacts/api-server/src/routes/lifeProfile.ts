import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { lifeProfileService } from "../services/lifeProfileService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const UpdateLifeProfileBody = z.object({
  wakeTime: z.string().optional(),
  sleepTime: z.string().optional(),
  preferredWorkHours: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
  studyHours: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
  breakDurationMinutes: z.number().int().optional(),
  exerciseSchedule: z.string().optional(),
  foodTiming: z.record(z.string(), z.string()).optional(),
  collegeSchedule: z.string().optional(),
  workSchedule: z.string().optional(),
  timezone: z.string().optional(),
  preferredNotificationTimes: z.array(z.string()).optional(),
  preferredLearningStyle: z.string().optional(),
  preferredPlanningStyle: z.enum(["relaxed", "balanced", "aggressive"]).optional(),
  energyPattern: z.string().optional(),
  dailyProductivityPattern: z.record(z.string(), z.unknown()).optional(),
  weekendSchedule: z.string().optional(),
  personalInterests: z.array(z.string()).optional(),
  personalPriorities: z.array(z.string()).optional(),
  personalValues: z.array(z.string()).optional(),
  favoriteTechnologies: z.array(z.string()).optional(),
  futureGoals: z.string().optional(),
  lifeVision: z.string().optional(),
});

router.get("/life-profile", async (req, res): Promise<void> => {
  const profile = await lifeProfileService.getOrCreate(req.auth!.userId);
  res.json(profile);
});

router.patch("/life-profile", async (req, res): Promise<void> => {
  const parsed = UpdateLifeProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const profile = await lifeProfileService.upsert(req.auth!.userId, parsed.data);
  res.json(profile);
});

export default router;
