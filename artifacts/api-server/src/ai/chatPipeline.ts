import { aiProvider } from "./aiProvider";
import { contextEngine } from "./contextEngine";
import { actionEngine, type ActionResult } from "./actionEngine";
import { chatTools } from "./toolDefinitions";
import { logger } from "../lib/logger";
import type OpenAI from "openai";

const SYSTEM_PROMPT = `You are the AI inside AI Brain OS, a personal second-brain / AI operating system.

Core architecture: every user message (typed OR spoken via voice-to-text — treat them identically)
flows through you as Intent -> Context -> Decision -> Action -> Response.

You have tools that let you create notes, ideas, memories and resources, manage tasks, goals,
habits, reminders and focus sessions, update your study and career profiles, and much more.
Decide from the user's natural language whether one or more tools should be called — never ask
the user to fill out a form, just act naturally:
- "I have an assignment due tomorrow" / general facts to capture -> create_note or create_task
- "Remember that ..." / lasting preferences, goals, decisions -> create_memory
- "Save this ..." / links, articles, reference material -> create_resource
- "I want to practice X every morning" -> create_habit AND create_reminder
- "What did I save/write about X", "find/show my ..." -> search_knowledge
- "What should I do/study/focus on" -> get_recommendations

A single message can imply more than one action (e.g. "I have an assignment due Friday" ->
create_task AND create_reminder AND plan_day entry) — call every tool the message actually implies,
not just the first one you notice.

Only call a tool when the user's message actually implies that action; for plain conversation,
questions, or when no data needs to change, just respond normally without calling a tool.
After a tool result comes back, weave it into a natural, concise, warm response — do not dump
raw JSON at the user. Briefly and specifically explain what you just did (e.g. "Created your task,
set a reminder, and added it to today's planner.") so the user can trust and verify your actions;
when you called more than one tool, mention each thing you did. If a tool call fails, apologize
briefly, explain simply, and keep going; never lose track of what the user originally said.`;

export interface PipelineResult {
  reply: string;
  actions: { actionType: string; summary: string }[];
}

/**
 * Retries transient OpenAI failures (rate limits, timeouts, 5xx) with a short
 * backoff. Non-retryable errors (auth, quota, bad request) fail immediately.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      const retryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504;
      const isQuotaError = (err as { code?: string })?.code === "insufficient_quota";
      const isAuthError = status === 401;
      if (!retryable || isQuotaError || isAuthError || i === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * This is the AI-first pipeline described in the spec:
 *   Text/Voice input -> Intent Engine (tool-calling) -> Context Engine ->
 *   Action Engine (validated writes + graph auto-link + logging) -> Response.
 * Both keyboard and voice input hit this exact same function — there is no
 * separate voice code path.
 */
export async function runChatPipeline(params: {
  userId: string;
  chatId: string;
  history: HistoryMessage[];
  onToken?: (token: string) => void;
}): Promise<PipelineResult> {
  const { userId, chatId, history, onToken } = params;

  const openai = aiProvider.getClient();

  if (!openai) {
    const { userMessage } = aiProvider.classifyError(
      new Error("no_client") as unknown as { status?: number; code?: string },
    );
    // classifyError won't match any case for a plain Error — fall back to status check
    const status = aiProvider.getStatus();
    const reply =
      status.status === "missing_key"
        ? "AI chat is not configured on this server (missing OPENAI_API_KEY). Your message was saved."
        : userMessage;
    onToken?.(reply);
    return { reply, actions: [] };
  }

  logger.info(
    { userId, chatId, stage: "intent_input" },
    "Pipeline: received message, gathering context",
  );
  const context = await contextEngine.gather(userId);
  logger.info(
    {
      userId,
      chatId,
      stage: "context",
      notes: context.pinnedNotes.length,
      ideas: context.recentIdeas.length,
      memories: context.memories.length,
      resources: context.recentResources.length,
    },
    "Pipeline: context assembled",
  );
  const systemContent = context.summary
    ? `${SYSTEM_PROMPT}\n\nContext about this user:\n${context.summary}`
    : SYSTEM_PROMPT;

  const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.map(
      (m) =>
        ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam,
    ),
  ];

  const actionsPerformed: { actionType: string; summary: string }[] = [];

  try {
    // Step 1: non-streamed call so we can inspect for tool calls (Intent + Decision).
    const first = await withRetry(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: baseMessages,
        tools: chatTools,
        tool_choice: "auto",
      }),
    );

    const choice = first.choices[0];
    const toolCalls = choice?.message.tool_calls ?? [];
    logger.info(
      {
        userId,
        chatId,
        stage: "intent",
        toolCalls: toolCalls.map((c) => (c.type === "function" ? c.function.name : c.type)),
      },
      "Pipeline: intent classified",
    );

    if (toolCalls.length === 0) {
      // No action needed — stream the direct response.
      const content = choice?.message.content ?? "";
      if (content) {
        onToken?.(content);
        return { reply: content, actions: [] };
      }
      // Defensive: fall back to streamed completion.
      return streamFinal(openai, baseMessages, onToken);
    }

    // Step 2: Action Engine executes every requested tool call (multi-intent).
    const toolResults: ActionResult[] = [];
    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      logger.info(
        { userId, chatId, stage: "action", tool: call.function.name },
        "Pipeline: executing action",
      );
      const result = await actionEngine.execute({
        userId,
        chatId,
        toolCallId: call.id,
        toolName: call.function.name,
        rawArgs: call.function.arguments,
      });
      logger.info(
        { userId, chatId, stage: "action_result", tool: call.function.name, ok: result.ok },
        "Pipeline: action executed",
      );
      toolResults.push(result);
      if (result.actionLogged) actionsPerformed.push(result.actionLogged);
    }

    // Step 3: feed tool outputs back to the model for a natural final response.
    const followUpMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      ...baseMessages,
      { role: "assistant", content: choice!.message.content, tool_calls: toolCalls },
      ...toolResults.map(
        (r): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
          role: "tool",
          tool_call_id: r.toolCallId,
          content: JSON.stringify(r.ok ? r.result : { error: r.result }),
        }),
      ),
    ];

    return streamFinal(openai, followUpMessages, onToken, actionsPerformed);
  } catch (err) {
    logger.error({ err }, "Chat pipeline failed");
    const { userMessage } = aiProvider.classifyError(err);
    onToken?.(userMessage);
    return { reply: userMessage, actions: actionsPerformed };
  }
}

async function streamFinal(
  openai: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  onToken?: (token: string) => void,
  actions: { actionType: string; summary: string }[] = [],
): Promise<PipelineResult> {
  let fullReply = "";
  const stream = await withRetry(() =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages,
    }),
  );

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? "";
    if (token) {
      fullReply += token;
      onToken?.(token);
    }
  }

  return { reply: fullReply, actions };
}
