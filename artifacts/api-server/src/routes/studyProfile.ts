import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { studyProfileService } from "../services/studyProfileService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const ProfileBody = z.object({
  semester: z.string().optional(),
  branch: z.string().optional(),
  credits: z.number().int().optional(),
  preferredStudyTime: z.string().optional(),
  weakSubjects: z.array(z.string()).optional(),
  strongSubjects: z.array(z.string()).optional(),
  targetCgpa: z.string().optional(),
  dailyStudyGoalMinutes: z.number().int().optional(),
  weeklyStudyGoalMinutes: z.number().int().optional(),
  preferredRevisionStyle: z.string().optional(),
  preferredLearningStyle: z.string().optional(),
  examPattern: z.string().optional(),
  programmingLanguages: z.array(z.string()).optional(),
  currentSkills: z.array(z.string()).optional(),
  targetSkills: z.array(z.string()).optional(),
});

router.get("/study-profile", async (req, res): Promise<void> => {
  const profile = await studyProfileService.getOrCreate(req.auth!.userId);
  res.json(profile);
});

router.patch("/study-profile", async (req, res): Promise<void> => {
  const parsed = ProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const profile = await studyProfileService.upsert(req.auth!.userId, parsed.data);
  res.json(profile);
});

export default router;
