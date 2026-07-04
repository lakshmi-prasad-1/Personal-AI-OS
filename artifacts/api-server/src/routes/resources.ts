import { Router, type IRouter } from "express";
import { resourcesService } from "../services/resourcesService";
import { knowledgeGraphService } from "../services/knowledgeGraphService";
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
  const resources = await resourcesService.list(req.auth!.userId);
  res.json(ListResourcesResponse.parse(resources));
});

router.post("/resources", async (req, res): Promise<void> => {
  const parsed = CreateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const resource = await resourcesService.create(req.auth!.userId, parsed.data);
  await knowledgeGraphService.autoLink({
    userId: req.auth!.userId,
    entityType: "resource",
    entityId: resource.id,
    label: resource.title,
    text: `${resource.title} ${resource.description ?? ""}`,
  });

  res.status(201).json(CreateResourceResponse.parse(resource));
});

router.get("/resources/:id", async (req, res): Promise<void> => {
  const params = GetResourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const resource = await resourcesService.get(req.auth!.userId, params.data.id);
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

  const resource = await resourcesService.update(req.auth!.userId, params.data.id, parsed.data);
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

  const resource = await resourcesService.remove(req.auth!.userId, params.data.id);
  if (!resource) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
