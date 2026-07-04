import { Router, type IRouter } from "express";
import { notesService } from "../services/notesService";
import { knowledgeGraphService } from "../services/knowledgeGraphService";
import {
  ListNotesResponse,
  CreateNoteBody,
  CreateNoteResponse,
  GetNoteParams,
  GetNoteResponse,
  UpdateNoteParams,
  UpdateNoteBody,
  UpdateNoteResponse,
  DeleteNoteParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/notes", async (req, res): Promise<void> => {
  const notes = await notesService.list(req.auth!.userId);
  res.json(ListNotesResponse.parse(notes));
});

router.post("/notes", async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const note = await notesService.create(req.auth!.userId, parsed.data);
  await knowledgeGraphService.autoLink({
    userId: req.auth!.userId,
    entityType: "note",
    entityId: note.id,
    label: note.title,
    text: `${note.title} ${note.content}`,
    tags: note.tags,
  });

  res.status(201).json(CreateNoteResponse.parse(note));
});

router.get("/notes/:id", async (req, res): Promise<void> => {
  const params = GetNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const note = await notesService.get(req.auth!.userId, params.data.id);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.json(GetNoteResponse.parse(note));
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
  const params = UpdateNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const note = await notesService.update(req.auth!.userId, params.data.id, parsed.data);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.json(UpdateNoteResponse.parse(note));
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const note = await notesService.remove(req.auth!.userId, params.data.id);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
