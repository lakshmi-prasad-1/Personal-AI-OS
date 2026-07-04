import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { aiSettingsService } from "../services/aiSettingsService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const UpdateAiSettingsBody = z.object({
  planningAggressiveness: z.enum(["relaxed", "balanced", "aggressive"]).optional(),
  recommendationFrequency: z.enum(["low", "medium", "high"]).optional(),
  personality: z.enum(["neutral", "encouraging", "direct", "playful"]).optional(),
  automationPreferences: z.enum(["suggest_only", "auto_apply"]).optional(),
  studyModeEnabled: z.boolean().optional(),
  careerModeEnabled: z.boolean().optional(),
  focusModeEnabled: z.boolean().optional(),
  voiceModeEnabled: z.boolean().optional(),
  proactiveNotificationsEnabled: z.boolean().optional(),
});

router.get("/ai-settings", async (req, res): Promise<void> => {
  const settings = await aiSettingsService.getOrCreate(req.auth!.userId);
  res.json(settings);
});

router.patch("/ai-settings", async (req, res): Promise<void> => {
  const parsed = UpdateAiSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const settings = await aiSettingsService.upsert(req.auth!.userId, parsed.data);
  res.json(settings);
});

export default router;
