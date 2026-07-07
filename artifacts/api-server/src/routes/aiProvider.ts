import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { aiProvider } from "../ai/aiProvider";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/ai-provider/status", (_req, res): void => {
  res.json(aiProvider.getStatus());
});

export default router;
