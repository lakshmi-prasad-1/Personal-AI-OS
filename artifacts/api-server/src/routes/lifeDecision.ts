import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { lifeDecisionEngine } from "../ai/lifeDecisionEngine";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/life-decision", async (req, res): Promise<void> => {
  const decision = await lifeDecisionEngine.decide(req.auth!.userId);
  res.json(decision);
});

export default router;
