import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, ideasTable } from "@workspace/db";
import {
  ListIdeasResponse,
  CreateIdeaBody,
  CreateIdeaResponse,
  GetIdeaParams,
  GetIdeaResponse,
  UpdateIdeaParams,
  UpdateIdeaBody,
  UpdateIdeaResponse,
  DeleteIdeaParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/ideas", async (req, res): Promise<void> => {
  const ideas = await db
    .select()
    .from(ideasTable)
    .where(eq(ideasTable.userId, req.auth!.userId))
    .orderBy(desc(ideasTable.updatedAt));

  res.json(ListIdeasResponse.parse(ideas));
});

router.post("/ideas", async (req, res): Promise<void> => {
  const parsed = CreateIdeaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [idea] = await db
    .insert(ideasTable)
    .values({ ...parsed.data, userId: req.auth!.userId })
    .returning();

  res.status(201).json(CreateIdeaResponse.parse(idea));
});

router.get("/ideas/:id", async (req, res): Promise<void> => {
  const params = GetIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [idea] = await db
    .select()
    .from(ideasTable)
    .where(and(eq(ideasTable.id, params.data.id), eq(ideasTable.userId, req.auth!.userId)));

  if (!idea) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }

  res.json(GetIdeaResponse.parse(idea));
});

router.patch("/ideas/:id", async (req, res): Promise<void> => {
  const params = UpdateIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateIdeaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [idea] = await db
    .update(ideasTable)
    .set(parsed.data)
    .where(and(eq(ideasTable.id, params.data.id), eq(ideasTable.userId, req.auth!.userId)))
    .returning();

  if (!idea) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }

  res.json(UpdateIdeaResponse.parse(idea));
});

router.delete("/ideas/:id", async (req, res): Promise<void> => {
  const params = DeleteIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [idea] = await db
    .delete(ideasTable)
    .where(and(eq(ideasTable.id, params.data.id), eq(ideasTable.userId, req.auth!.userId)))
    .returning();

  if (!idea) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
