import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, resourcesTable } from "@workspace/db";
import {
  ListResourcesResponse,
  CreateResourceBody,
  CreateResourceResponse,
  GetResourceParams,
  GetResourceResponse,
  UpdateResourceParams,
  UpdateResourceBody,
  UpdateResourceResponse,
  DeleteResourceParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/resources", async (req, res): Promise<void> => {
  const resources = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.userId, req.auth!.userId))
    .orderBy(desc(resourcesTable.updatedAt));

  res.json(ListResourcesResponse.parse(resources));
});

router.post("/resources", async (req, res): Promise<void> => {
  const parsed = CreateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [resource] = await db
    .insert(resourcesTable)
    .values({ ...parsed.data, userId: req.auth!.userId })
    .returning();

  res.status(201).json(CreateResourceResponse.parse(resource));
});

router.get("/resources/:id", async (req, res): Promise<void> => {
  const params = GetResourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [resource] = await db
    .select()
    .from(resourcesTable)
    .where(and(eq(resourcesTable.id, params.data.id), eq(resourcesTable.userId, req.auth!.userId)));

  if (!resource) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }

  res.json(GetResourceResponse.parse(resource));
});

router.patch("/resources/:id", async (req, res): Promise<void> => {
  const params = UpdateResourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [resource] = await db
    .update(resourcesTable)
    .set(parsed.data)
    .where(and(eq(resourcesTable.id, params.data.id), eq(resourcesTable.userId, req.auth!.userId)))
    .returning();

  if (!resource) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }

  res.json(UpdateResourceResponse.parse(resource));
});

router.delete("/resources/:id", async (req, res): Promise<void> => {
  const params = DeleteResourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [resource] = await db
    .delete(resourcesTable)
    .where(and(eq(resourcesTable.id, params.data.id), eq(resourcesTable.userId, req.auth!.userId)))
    .returning();

  if (!resource) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
