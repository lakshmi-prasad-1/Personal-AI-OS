import { Router, type IRouter } from "express";
import { ideasService } from "../services/ideasService";
import { knowledgeGraphService } from "../services/knowledgeGraphService";
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
  const ideas = await ideasService.list(req.auth!.userId);
  res.json(ListIdeasResponse.parse(ideas));
});

router.post("/ideas", async (req, res): Promise<void> => {
  const parsed = CreateIdeaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const idea = await ideasService.create(req.auth!.userId, parsed.data);
  await knowledgeGraphService.autoLink({
    userId: req.auth!.userId,
    entityType: "idea",
    entityId: idea.id,
    label: idea.title,
    text: `${idea.title} ${idea.content}`,
    tags: idea.tags,
  });

  res.status(201).json(CreateIdeaResponse.parse(idea));
});

router.get("/ideas/:id", async (req, res): Promise<void> => {
  const params = GetIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const idea = await ideasService.get(req.auth!.userId, params.data.id);
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

  const idea = await ideasService.update(req.auth!.userId, params.data.id, parsed.data);
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

  const idea = await ideasService.remove(req.auth!.userId, params.data.id);
  if (!idea) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
