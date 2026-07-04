import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { productivityAnalyticsService } from "../services/productivityAnalyticsService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const QueryDays = z.object({ days: z.coerce.number().int().min(1).max(365).optional().default(30) });

router.get("/analytics/productivity", async (req, res): Promise<void> => {
  const parsed = QueryDays.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const analytics = await productivityAnalyticsService.compute(req.auth!.userId, parsed.data.days);
  res.json(analytics);
});

export default router;
