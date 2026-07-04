import { Router, type IRouter } from "express";
import { chatService } from "../services/chatService";
import { runChatPipeline } from "../ai/chatPipeline";
import {
  ListChatsResponse,
  CreateChatBody,
  CreateChatResponse,
  GetChatParams,
  GetChatResponse,
  DeleteChatParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/chats", async (req, res): Promise<void> => {
  const chats = await chatService.list(req.auth!.userId);
  res.json(ListChatsResponse.parse(chats));
});

router.post("/chats", async (req, res): Promise<void> => {
  const parsed = CreateChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const chat = await chatService.create(req.auth!.userId, parsed.data.title);
  res.status(201).json(CreateChatResponse.parse(chat));
});

router.get("/chats/:id", async (req, res): Promise<void> => {
  const params = GetChatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const chat = await chatService.get(req.auth!.userId, params.data.id);
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  const messages = await chatService.getMessages(chat.id);
  res.json(GetChatResponse.parse({ ...chat, messages }));
});

router.delete("/chats/:id", async (req, res): Promise<void> => {
  const params = DeleteChatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const chat = await chatService.remove(req.auth!.userId, params.data.id);
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/chats/:id/message", async (req, res): Promise<void> => {
  const params = GetChatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const content = typeof req.body?.content === "string" ? req.body.content : null;
  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const userId = req.auth!.userId;
  const chat = await chatService.get(userId, params.data.id);
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  // Persist the user's message immediately so it is never lost, even if the
  // AI pipeline below fails.
  await chatService.addMessage(chat.id, "user", content);
  const history = await chatService.getMessages(chat.id);

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  let fullReply = "";
  try {
    const result = await runChatPipeline({
      userId,
      chatId: chat.id,
      history: history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      onToken: (token) => {
        fullReply += token;
        res.write(token);
      },
    });
    if (!fullReply) fullReply = result.reply;
  } catch (err) {
    req.log.error({ err }, "Chat pipeline failed");
    if (!fullReply) {
      fullReply = "Sorry, something went wrong generating a response.";
      res.write(fullReply);
    }
  }

  await chatService.addMessage(chat.id, "assistant", fullReply || "...");
  await chatService.renameIfDefault(chat.id, chat.title, content);

  res.end();
});

export default router;
