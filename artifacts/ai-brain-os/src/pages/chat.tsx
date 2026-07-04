import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListChats,
  useCreateChat,
  useGetChat,
  useDeleteChat,
  getListChatsQueryKey,
  getGetChatQueryKey,
} from "@workspace/api-client-react";
import { MessageSquare, Plus, Trash2, Send, Bot, User, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const { data: chats, isLoading } = useListChats();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createChat = useCreateChat();
  const deleteChat = useDeleteChat();

  const sortedChats = [...(chats || [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  useEffect(() => {
    if (!activeChatId && sortedChats.length > 0) {
      setActiveChatId(sortedChats[0].id);
    }
  }, [sortedChats, activeChatId]);

  const handleNewChat = () => {
    createChat.mutate(
      { data: { title: "New Chat" } },
      {
        onSuccess: (chat) => {
          queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
          setActiveChatId(chat.id);
        },
      },
    );
  };

  const handleDeleteChat = (id: string) => {
    deleteChat.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
          if (activeChatId === id) setActiveChatId(null);
          toast({ title: "Chat deleted" });
        },
      },
    );
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-background">
      <div className="w-full md:w-72 border-r border-border h-full flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Chats
          </h1>
          <Button size="sm" onClick={handleNewChat} disabled={createChat.isPending} data-testid="button-new-chat">
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Loading chats...</div>
          ) : sortedChats.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg bg-muted/50 mx-1 text-sm">
              No chats yet. Start a conversation!
            </div>
          ) : (
            sortedChats.map((chat, i) => (
              <div
                key={chat.id}
                className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors animate-in fade-in slide-in-from-left-2 ${
                  activeChatId === chat.id ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent"
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => setActiveChatId(chat.id)}
                data-testid={`chat-item-${chat.id}`}
              >
                <span className="text-sm font-medium truncate">{chat.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  data-testid={`button-delete-chat-${chat.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 h-full flex flex-col bg-muted/20">
        {activeChatId ? (
          <ChatThread key={activeChatId} chatId={activeChatId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <Bot className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-medium text-foreground mb-2">No chat selected</h2>
            <p>Start a new chat to talk with your assistant.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatThread({ chatId }: { chatId: string }) {
  const { data: chat, isLoading } = useGetChat(chatId);
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const messages: LocalMessage[] = [
    ...(chat?.messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })) || []),
    ...(optimisticUserMessage ? [{ id: "optimistic-user", role: "user" as const, content: optimisticUserMessage }] : []),
    ...(isStreaming ? [{ id: "streaming", role: "assistant" as const, content: streamingText }] : []),
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamingText]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setInput("");
    setOptimisticUserMessage(content);
    setIsStreaming(true);
    setStreamingText("");

    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${base}/api/chats/${chatId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to send message");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamingText(acc);
      }
    } catch (err) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      setOptimisticUserMessage(null);
      queryClient.invalidateQueries({ queryKey: getGetChatQueryKey(chatId) });
      queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 animate-in fade-in duration-300">
            Say hello to your assistant.
          </div>
        ) : (
          messages.map((message, i) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
              style={{ animationDelay: `${Math.min(i, 5) * 30}ms` }}
              data-testid={`message-${message.role}-${i}`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border rounded-bl-sm"
                }`}
              >
                {message.content || (message.id === "streaming" ? "..." : "")}
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border flex items-center gap-2 bg-card/50">
        <Input
          placeholder={isListening ? "Listening..." : "Type a message..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isStreaming}
          data-testid="input-chat-message"
        />
        {voiceSupported && (
          <Button
            type="button"
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={toggleListening}
            disabled={isStreaming}
            title={isListening ? "Stop voice input" : "Speak your message"}
            data-testid="button-voice-input"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
        )}
        <Button onClick={handleSend} disabled={isStreaming || !input.trim()} data-testid="button-send-message">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
