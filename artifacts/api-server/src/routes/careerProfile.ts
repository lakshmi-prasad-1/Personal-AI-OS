import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { careerProfileService } from "../services/careerProfileService";
import { careerAnalyticsService } from "../services/careerAnalyticsService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const UpdateCareerProfileBody = z.object({
  degree: z.string().optional(),
  university: z.string().optional(),
  currentSemester: z.string().optional(),
  graduationYear: z.string().optional(),
  preferredRoles: z.array(z.string()).optional(),
  preferredCompanies: z.array(z.string()).optional(),
  preferredLocations: z.array(z.string()).optional(),
  expectedSalary: z.string().optional(),
  preferredWorkTypes: z.array(z.string()).optional(),
  softSkills: z.array(z.string()).optional(),
  certificates: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
  portfolioUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  leetcodeUrl: z.string().optional(),
  codeforcesUrl: z.string().optional(),
  hackerrankUrl: z.string().optional(),
});

router.get("/career-profile", async (req, res): Promise<void> => {
  res.json(await careerProfileService.getOrCreate(req.auth!.userId));
});

router.patch("/career-profile", async (req, res): Promise<void> => {
  const parsed = UpdateCareerProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  res.json(await careerProfileService.upsert(req.auth!.userId, parsed.data));
});

router.get("/career-dashboard", async (req, res): Promise<void> => {
  res.json(await careerAnalyticsService.overview(req.auth!.userId));
});

router.get("/career-recommendations", async (req, res): Promise<void> => {
  res.json({ recommendations: await careerAnalyticsService.recommendation(req.auth!.userId) });
});

export default router;
