import { and, asc, desc, eq } from "drizzle-orm";
import { db, chatsTable, chatMessagesTable, type Chat, type ChatMessage } from "@workspace/db";

export const chatService = {
  async list(userId: string): Promise<Chat[]> {
    return db.select().from(chatsTable).where(eq(chatsTable.userId, userId)).orderBy(desc(chatsTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<Chat | undefined> {
    const [chat] = await db
      .select()
      .from(chatsTable)
      .where(and(eq(chatsTable.id, id), eq(chatsTable.userId, userId)));
    return chat;
  },

  async create(userId: string, title?: string): Promise<Chat> {
    const [chat] = await db
      .insert(chatsTable)
      .values({ userId, title: title ?? "New Chat" })
      .returning();
    if (!chat) throw new Error("Failed to create chat");
    return chat;
  },

  async remove(userId: string, id: string): Promise<Chat | undefined> {
    const [chat] = await db
      .delete(chatsTable)
      .where(and(eq(chatsTable.id, id), eq(chatsTable.userId, userId)))
      .returning();
    return chat;
  },

  async getMessages(chatId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessagesTable).where(eq(chatMessagesTable.chatId, chatId)).orderBy(asc(chatMessagesTable.createdAt));
  },

  async addMessage(chatId: string, role: "user" | "assistant", content: string): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessagesTable).values({ chatId, role, content }).returning();
    if (!message) throw new Error("Failed to add chat message");
    return message;
  },

  async renameIfDefault(chatId: string, currentTitle: string, fallback: string): Promise<void> {
    if (currentTitle !== "New Chat") return;
    await db
      .update(chatsTable)
      .set({ title: fallback.slice(0, 60) })
      .where(eq(chatsTable.id, chatId));
  },
};
