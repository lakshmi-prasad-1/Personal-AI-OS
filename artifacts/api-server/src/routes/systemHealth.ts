import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();
router.use(requireAuth);

const startedAt = Date.now();

router.get("/system-health", async (_req, res): Promise<void> => {
  let dbOk = true;
  try {
    await db.select({ one: sql<number>`1` }).from(usersTable).limit(1);
  } catch {
    dbOk = false;
  }

  res.json({
    status: dbOk ? "ok" : "degraded",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    checks: {
      database: dbOk ? "ok" : "error",
      aiChat: process.env["OPENAI_API_KEY"] ? "enabled" : "disabled (no OPENAI_API_KEY — chat degrades gracefully)",
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
