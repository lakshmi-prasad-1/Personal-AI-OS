import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { timelineService } from "../services/timelineService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const QueryDays = z.object({ days: z.coerce.number().int().min(1).max(90).optional().default(7) });

router.get("/timeline", async (req, res): Promise<void> => {
  const parsed = QueryDays.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const entries = await timelineService.recent(req.auth!.userId, parsed.data.days);
  res.json(entries);
});

router.get("/timeline/today", async (req, res): Promise<void> => {
  const entries = await timelineService.today(req.auth!.userId);
  res.json(entries);
});

export default router;
