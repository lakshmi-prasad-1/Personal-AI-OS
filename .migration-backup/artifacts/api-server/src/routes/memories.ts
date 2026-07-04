import { Router, type IRouter } from "express";
import { memoriesService } from "../services/memoriesService";
import { knowledgeGraphService } from "../services/knowledgeGraphService";
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
  const memories = await memoriesService.list(req.auth!.userId);
  res.json(ListMemoriesResponse.parse(memories));
});

router.post("/memories", async (req, res): Promise<void> => {
  const parsed = CreateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const memory = await memoriesService.create(req.auth!.userId, parsed.data);
  await knowledgeGraphService.autoLink({
    userId: req.auth!.userId,
    entityType: "memory",
    entityId: memory.id,
    label: memory.title,
    text: `${memory.title} ${memory.description}`,
    tags: memory.tags,
  });

  res.status(201).json(CreateMemoryResponse.parse(memory));
});

router.get("/memories/:id", async (req, res): Promise<void> => {
  const params = GetMemoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const memory = await memoriesService.get(req.auth!.userId, params.data.id);
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

  const memory = await memoriesService.update(req.auth!.userId, params.data.id, parsed.data);
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

  const memory = await memoriesService.remove(req.auth!.userId, params.data.id);
  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
