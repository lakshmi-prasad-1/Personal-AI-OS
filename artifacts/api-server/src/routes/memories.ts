import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, memoriesTable } from "@workspace/db";
import {
  ListMemoriesResponse,
  CreateMemoryBody,
  CreateMemoryResponse,
  GetMemoryParams,
  GetMemoryResponse,
  UpdateMemoryParams,
  UpdateMemoryBody,
  UpdateMemoryResponse,
  DeleteMemoryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/memories", async (req, res): Promise<void> => {
  const memories = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, req.auth!.userId))
    .orderBy(desc(memoriesTable.importanceScore), desc(memoriesTable.updatedAt));

  res.json(ListMemoriesResponse.parse(memories));
});

router.post("/memories", async (req, res): Promise<void> => {
  const parsed = CreateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [memory] = await db
    .insert(memoriesTable)
    .values({ ...parsed.data, userId: req.auth!.userId })
    .returning();

  res.status(201).json(CreateMemoryResponse.parse(memory));
});

router.get("/memories/:id", async (req, res): Promise<void> => {
  const params = GetMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [memory] = await db
    .select()
    .from(memoriesTable)
    .where(and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.auth!.userId)));

  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  res.json(GetMemoryResponse.parse(memory));
});

router.patch("/memories/:id", async (req, res): Promise<void> => {
  const params = UpdateMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [memory] = await db
    .update(memoriesTable)
    .set(parsed.data)
    .where(and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.auth!.userId)))
    .returning();

  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  res.json(UpdateMemoryResponse.parse(memory));
});

router.delete("/memories/:id", async (req, res): Promise<void> => {
  const params = DeleteMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [memory] = await db
    .delete(memoriesTable)
    .where(and(eq(memoriesTable.id, params.data.id), eq(memoriesTable.userId, req.auth!.userId)))
    .returning();

  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
