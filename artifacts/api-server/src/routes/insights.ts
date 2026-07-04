import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { insightsService } from "../services/insightsService";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/insights", async (req, res): Promise<void> => {
  const insights = await insightsService.generate(req.auth!.userId);
  res.json(insights);
});

export default router;
