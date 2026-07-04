import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { reviewService } from "../services/reviewService";
import { z } from "zod/v4";

const router: IRouter = Router();
router.use(requireAuth);

const DateQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

router.get("/reviews/daily", async (req, res): Promise<void> => {
  const query = DateQuery.safeParse(req.query);
  const date = (query.success && query.data.date) ? query.data.date : new Date().toISOString().slice(0, 10);
  const review = await reviewService.getDailyReview(req.auth!.userId, date);
  res.json(review ?? null);
});

router.get("/reviews/daily/list", async (req, res): Promise<void> => {
  const reviews = await reviewService.listDailyReviews(req.auth!.userId);
  res.json(reviews);
});

router.post("/reviews/daily/generate", async (req, res): Promise<void> => {
  const query = DateQuery.safeParse(req.query);
  const date = (query.success && query.data.date) ? query.data.date : new Date().toISOString().slice(0, 10);
  const review = await reviewService.generateDailyReview(req.auth!.userId, date);
  res.json(review);
});

router.get("/reviews/weekly", async (req, res): Promise<void> => {
  const query = DateQuery.safeParse(req.query);
  const weekStart = query.success && query.data.date ? query.data.date : undefined;
  if (weekStart) {
    const review = await reviewService.getWeeklyReview(req.auth!.userId, weekStart);
    res.json(review ?? null);
  } else {
    const reviews = await reviewService.listWeeklyReviews(req.auth!.userId);
    res.json(reviews[0] ?? null);
  }
});

router.get("/reviews/weekly/list", async (req, res): Promise<void> => {
  const reviews = await reviewService.listWeeklyReviews(req.auth!.userId);
  res.json(reviews);
});

router.post("/reviews/weekly/generate", async (req, res): Promise<void> => {
  const review = await reviewService.generateWeeklyReview(req.auth!.userId);
  res.json(review);
});

export default router;
