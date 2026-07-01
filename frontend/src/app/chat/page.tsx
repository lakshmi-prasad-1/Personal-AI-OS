"use client";

import { useEffect, useState, useRef } from "react";
import { Send, BrainCircuit } from "lucide-react";
import { apiFetch, streamChatMessage } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your AI Brain OS assistant. I understand your profile, memories, and knowledge base." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<{ id: string }[]>("/chat/")
      .then(async (chats) => {
        if (chats.length > 0) {
          setChatId(chats[0].id);
          const chat = await apiFetch<{ messages: { role: string; content: string }[] }>(`/chat/${chats[0].id}`);
          if (chat.messages?.length) {
            setMessages(chat.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
          }
        } else {
          const created = await apiFetch<{ id: string }>("/chat/", {
            method: "POST",
            body: JSON.stringify({ title: "Main Chat" }),
          });
          setChatId(created.id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatId || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);

    let assistantContent = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      await streamChatMessage(chatId, userMsg, (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          return updated;
        });
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Failed to reach the backend. Ensure the API is running on port 8000.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight">Chat</h1>
        <p className="text-gray-400">Powered by AI Brain Context Engine + auto memory extraction.</p>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 bg-gray-900 border border-gray-800 rounded-xl p-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <BrainCircuit size={16} />
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-gray-800 text-gray-100 rounded-bl-none"
              }`}
            >
              {msg.content || (streaming && i === messages.length - 1 ? "..." : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask your second brain..."
          disabled={streaming || !chatId}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={streaming || !chatId}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Send size={16} />
          Send
        </button>
      </div>
    </div>
  );
}
