import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { aiProvider } from "../ai/aiProvider";

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

  const providerState = aiProvider.getStatus();

  res.json({
    status: dbOk ? "ok" : "degraded",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    checks: {
      database: dbOk ? "ok" : "error",
      aiProvider: {
        status: providerState.status,
        message: providerState.message,
        lastChecked: providerState.lastChecked,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
