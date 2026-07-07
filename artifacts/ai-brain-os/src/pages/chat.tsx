import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useListChats,
  useCreateChat,
  useGetChat,
  useDeleteChat,
  getListChatsQueryKey,
  getGetChatQueryKey,
} from "@workspace/api-client-react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Bot,
  User,
  Mic,
  MicOff,
  AlertCircle,
  WifiOff,
  KeyRound,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";
import { useVoiceInput, VOICE_ERROR_MESSAGES } from "@/hooks/use-voice-input";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AiSettings {
  voiceModeEnabled: boolean;
}

interface ProviderState {
  status: string;
  message: string;
  lastChecked: string | null;
}

// ─── Provider status helpers ─────────────────────────────────────────────────

const STATUS_META: Record<string, { icon: typeof AlertCircle; color: string; label: string }> = {
  missing_key: {
    icon: KeyRound,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    label: "AI not configured — add OPENAI_API_KEY to enable chat",
  },
  invalid_key: {
    icon: KeyRound,
    color: "text-red-600 bg-red-50 border-red-200",
    label: "AI API key is invalid or expired",
  },
  quota_exceeded: {
    icon: Gauge,
    color: "text-orange-600 bg-orange-50 border-orange-200",
    label: "OpenAI quota exceeded — check your billing",
  },
  rate_limited: {
    icon: AlertCircle,
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    label: "AI is rate-limited — messages will be saved, try again shortly",
  },
  provider_offline: {
    icon: WifiOff,
    color: "text-red-600 bg-red-50 border-red-200",
    label: "AI provider is offline — messages are being saved",
  },
  network_error: {
    icon: WifiOff,
    color: "text-red-600 bg-red-50 border-red-200",
    label: "Network error reaching AI provider",
  },
};

// ─── Root component ──────────────────────────────────────────────────────────

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
      {/* Sidebar */}
      <div className="w-full md:w-72 border-r border-border h-full flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Chats
          </h1>
          <Button
            size="sm"
            onClick={handleNewChat}
            disabled={createChat.isPending}
            data-testid="button-new-chat"
          >
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
                  activeChatId === chat.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-sidebar-accent"
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

      {/* Main area */}
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

// ─── Chat thread ─────────────────────────────────────────────────────────────

function ChatThread({ chatId }: { chatId: string }) {
  const { data: chat, isLoading } = useGetChat(chatId);
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // AI provider status (poll every 30 s; shows banner when not connected)
  const { data: providerStatus } = useQuery<ProviderState>({
    queryKey: ["ai-provider-status"],
    queryFn: () => apiGet("/ai-provider/status"),
    refetchInterval: 30_000,
    retry: false,
    staleTime: 20_000,
  });

  // AI settings — respect voiceModeEnabled
  const { data: aiSettings } = useQuery<AiSettings>({
    queryKey: ["ai-settings"],
    queryFn: () => apiGet("/ai-settings"),
    staleTime: 60_000,
    retry: false,
  });

  // Ref that always points to the latest handleSend (avoids stale closure in voice callback)
  const handleSendRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const voice = useVoiceInput({
    onFinalTranscript: (transcript) => {
      setInput(transcript);
      // Auto-send after React has committed the state update
      setTimeout(() => {
        handleSendRef.current?.();
      }, 80);
    },
  });

  // Show voice errors as toasts
  useEffect(() => {
    if (voice.error) {
      const msg = VOICE_ERROR_MESSAGES[voice.error];
      if (voice.error !== "aborted") {
        toast({ title: "Voice input", description: msg, variant: "destructive" });
      }
    }
  }, [voice.error, toast]);

  const messages: LocalMessage[] = [
    ...(chat?.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
    })) || []),
    ...(optimisticUserMessage
      ? [{ id: "optimistic-user", role: "user" as const, content: optimisticUserMessage }]
      : []),
    ...(isStreaming ? [{ id: "streaming", role: "assistant" as const, content: streamingText }] : []),
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamingText]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    if (voice.isListening) voice.stopListening();

    setInput("");
    voice.clearTranscript();
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
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      setOptimisticUserMessage(null);
      queryClient.invalidateQueries({ queryKey: getGetChatQueryKey(chatId) });
      queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
    }
  };

  // Keep ref in sync
  handleSendRef.current = handleSend;

  const toggleVoice = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  };

  const showVoiceButton =
    voice.voiceSupported && (aiSettings?.voiceModeEnabled ?? true);

  const providerBanner = resolveProviderBanner(providerStatus);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Provider status banner */}
      {providerBanner && (
        <div
          className={`flex items-center gap-2 px-4 py-2 text-xs border-b ${providerBanner.color}`}
        >
          <providerBanner.icon className="w-3.5 h-3.5 shrink-0" />
          <span>{providerBanner.label}</span>
        </div>
      )}

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground animate-in fade-in duration-300">
            <Bot className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm">Say hello to your assistant.</p>
            {showVoiceButton && (
              <p className="text-xs text-muted-foreground/60">
                Tap the mic to speak, or type below.
              </p>
            )}
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

      {/* Voice listening indicator */}
      {voice.isListening && (
        <div className="mx-4 mb-1 flex items-center gap-2 text-xs text-primary animate-in fade-in duration-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="italic text-muted-foreground">
            {voice.transcript ? `"${voice.transcript}"` : "Listening…"}
          </span>
        </div>
      )}

      {/* Input bar */}
      <div className="p-4 border-t border-border flex items-center gap-2 bg-card/50">
        <Input
          placeholder={voice.isListening ? "Listening — speak now…" : "Type a message…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isStreaming}
          className={voice.isListening ? "border-primary ring-1 ring-primary/30" : ""}
          data-testid="input-chat-message"
        />

        {showVoiceButton && (
          <Button
            type="button"
            variant={voice.isListening ? "destructive" : "outline"}
            size="icon"
            onClick={toggleVoice}
            disabled={isStreaming}
            title={voice.isListening ? "Stop voice input" : "Speak your message"}
            className={
              voice.isListening
                ? "relative overflow-visible ring-2 ring-destructive/40"
                : ""
            }
            data-testid="button-voice-input"
          >
            {voice.isListening && (
              <span className="absolute inset-0 rounded-md animate-ping bg-destructive/20 pointer-events-none" />
            )}
            {voice.isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        )}

        <Button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          data-testid="button-send-message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveProviderBanner(
  status: ProviderState | undefined,
): (typeof STATUS_META)[string] | null {
  if (!status) return null;
  if (status.status === "connected" || status.status === "loading") return null;
  return STATUS_META[status.status] ?? null;
}
