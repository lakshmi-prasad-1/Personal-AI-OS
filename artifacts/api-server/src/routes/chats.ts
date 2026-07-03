import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import OpenAI from "openai";
import { db, chatsTable, chatMessagesTable } from "@workspace/db";
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

const openaiApiKey = process.env["OPENAI_API_KEY"];
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

router.get("/chats", async (req, res): Promise<void> => {
  const chats = await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.userId, req.auth!.userId))
    .orderBy(desc(chatsTable.updatedAt));

  res.json(ListChatsResponse.parse(chats));
});

router.post("/chats", async (req, res): Promise<void> => {
  const parsed = CreateChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [chat] = await db
    .insert(chatsTable)
    .values({ ...parsed.data, userId: req.auth!.userId })
    .returning();

  res.status(201).json(CreateChatResponse.parse(chat));
});

router.get("/chats/:id", async (req, res): Promise<void> => {
  const params = GetChatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [chat] = await db
    .select()
    .from(chatsTable)
    .where(and(eq(chatsTable.id, params.data.id), eq(chatsTable.userId, req.auth!.userId)));

  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.chatId, chat.id))
    .orderBy(asc(chatMessagesTable.createdAt));

  res.json(GetChatResponse.parse({ ...chat, messages }));
});

router.delete("/chats/:id", async (req, res): Promise<void> => {
  const params = DeleteChatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [chat] = await db
    .delete(chatsTable)
    .where(and(eq(chatsTable.id, params.data.id), eq(chatsTable.userId, req.auth!.userId)))
    .returning();

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

  const [chat] = await db
    .select()
    .from(chatsTable)
    .where(and(eq(chatsTable.id, params.data.id), eq(chatsTable.userId, req.auth!.userId)));

  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  await db.insert(chatMessagesTable).values({ chatId: chat.id, role: "user", content });

  const history = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.chatId, chat.id))
    .orderBy(asc(chatMessagesTable.createdAt));

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  let fullReply = "";

  try {
    if (!openai) {
      fullReply =
        "AI chat is not configured on this server (missing OPENAI_API_KEY). Your message was saved.";
      res.write(fullReply);
    } else {
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "You are the assistant inside AI Brain OS, a personal second-brain app. Be concise, helpful, and warm.",
          },
          ...history.map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: m.content,
          })),
        ],
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? "";
        if (token) {
          fullReply += token;
          res.write(token);
        }
      }
    }
  } catch (err) {
    req.log.error({ err }, "Chat completion failed");
    if (!fullReply) {
      fullReply = "Sorry, something went wrong generating a response.";
      res.write(fullReply);
    }
  }

  await db.insert(chatMessagesTable).values({ chatId: chat.id, role: "assistant", content: fullReply });
  await db
    .update(chatsTable)
    .set({ title: chat.title === "New Chat" ? content.slice(0, 60) : chat.title })
    .where(eq(chatsTable.id, chat.id));

  res.end();
});

export default router;
