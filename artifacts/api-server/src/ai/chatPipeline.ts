import { aiProvider, type ProviderHandle, type ProviderName } from "./aiProvider";
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

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Retries a single-provider call on transient failures (rate limits, 5xx).
 * Non-transient errors (auth, quota, network) surface immediately so the caller
 * can fall back to the next provider.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  providerName: ProviderName,
  attempts = 2,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const { withinProviderRetryable } = aiProvider.classifyError(err, providerName);
      if (!withinProviderRetryable || i === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * Phase A — Intent classification.
 *
 * Tries each provider in turn until one succeeds or all fail.
 * This is a read-only LLM call — no side effects — so provider fallback is safe.
 */
async function runIntentPhase(
  providers: ProviderHandle[],
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  userId: string,
  chatId: string,
): Promise<{
  choice: OpenAI.Chat.Completions.ChatCompletion.Choice;
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
  provider: ProviderHandle;
}> {
  let lastErr: unknown;

  for (const provider of providers) {
    const { client, model, providerName } = provider;
    try {
      logger.info(
        { userId, chatId, providerName, model, stage: "intent_start" },
        "Pipeline: intent phase",
      );
      const completion = await withRetry(
        () =>
          client.chat.completions.create({
            model,
            messages,
            tools: chatTools,
            tool_choice: "auto",
          }),
        providerName,
      );

      const choice = completion.choices[0]!;
      const toolCalls = choice.message.tool_calls ?? [];
      logger.info(
        {
          userId,
          chatId,
          providerName,
          stage: "intent",
          toolCalls: toolCalls.map((c) => (c.type === "function" ? c.function.name : c.type)),
        },
        "Pipeline: intent classified",
      );
      return { choice, toolCalls, provider };
    } catch (err) {
      lastErr = err;
      const { status } = aiProvider.classifyError(err, provider.providerName);
      logger.warn(
        { err, providerName: provider.providerName, status },
        "Pipeline: intent phase failed, trying next provider",
      );
    }
  }

  throw lastErr;
}

/**
 * Phase B — Action execution.
 *
 * Executes all tool calls via the Action Engine. This causes database writes,
 * so it runs exactly once — never retried across providers.
 */
async function runActionPhase(
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
  userId: string,
  chatId: string,
): Promise<{
  toolResults: ActionResult[];
  actionsPerformed: { actionType: string; summary: string }[];
}> {
  const toolResults: ActionResult[] = [];
  const actionsPerformed: { actionType: string; summary: string }[] = [];

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

  return { toolResults, actionsPerformed };
}

/**
 * Phase C — Final response generation (streaming).
 *
 * Tries each provider in turn until one succeeds or all fail.
 * This is a read-only LLM call — no side effects — so provider fallback is safe.
 */
async function runResponsePhase(
  providers: ProviderHandle[],
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  onToken?: (token: string) => void,
): Promise<{ reply: string; provider: ProviderHandle }> {
  let lastErr: unknown;

  for (const provider of providers) {
    const { client, model, providerName } = provider;
    try {
      let fullReply = "";
      const stream = await withRetry(
        () =>
          client.chat.completions.create({
            model,
            stream: true,
            messages,
          }),
        providerName,
      );

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? "";
        if (token) {
          fullReply += token;
          onToken?.(token);
        }
      }

      return { reply: fullReply, provider };
    } catch (err) {
      lastErr = err;
      const { status } = aiProvider.classifyError(err, providerName);
      logger.warn(
        { err, providerName, status },
        "Pipeline: response phase failed, trying next provider",
      );
    }
  }

  throw lastErr;
}

/**
 * Main pipeline entry point.
 *
 *   Text/Voice input
 *     → Phase A: Intent Engine (LLM, provider-retryable, no side effects)
 *     → Phase B: Action Engine (DB writes, runs exactly once, no provider retry)
 *     → Phase C: Response streaming (LLM, provider-retryable, no side effects)
 *
 * Providers are tried in order (Gemini → Groq → OpenAI) for Phases A and C.
 * Phase B is intentionally never retried across providers to prevent duplicate writes.
 */
export async function runChatPipeline(params: {
  userId: string;
  chatId: string;
  history: HistoryMessage[];
  onToken?: (token: string) => void;
}): Promise<PipelineResult> {
  const { userId, chatId, history, onToken } = params;

  const providers = aiProvider.getAllProviders();

  if (providers.length === 0) {
    const reply =
      "AI chat is not configured on this server. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY to enable AI features. Your message was saved.";
    onToken?.(reply);
    return { reply, actions: [] };
  }

  // Assemble context and messages.
  logger.info({ userId, chatId, stage: "context_gather" }, "Pipeline: gathering context");
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
      (m): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
        role: m.role,
        content: m.content,
      }),
    ),
  ];

  // ── Phase A: Intent classification ──────────────────────────────────────────
  let intentResult: Awaited<ReturnType<typeof runIntentPhase>>;
  try {
    intentResult = await runIntentPhase(providers, baseMessages, userId, chatId);
  } catch (err) {
    const { userMessage } = aiProvider.classifyError(err, "none");
    const reply = `All AI providers failed during intent analysis. ${userMessage}`;
    onToken?.(reply);
    return { reply, actions: [] };
  }

  const { choice, toolCalls, provider: intentProvider } = intentResult;

  // If no tools were needed, return the direct response immediately.
  if (toolCalls.length === 0) {
    const content = choice.message.content ?? "";
    if (content) {
      aiProvider.markConnected(intentProvider.providerName);
      onToken?.(content);
      return { reply: content, actions: [] };
    }
    // Defensive: stream a completion if content was empty.
    try {
      const { reply, provider } = await runResponsePhase(providers, baseMessages, onToken);
      aiProvider.markConnected(provider.providerName);
      return { reply, actions: [] };
    } catch (err) {
      const { userMessage } = aiProvider.classifyError(err, "none");
      onToken?.(userMessage);
      return { reply: userMessage, actions: [] };
    }
  }

  // ── Phase B: Action execution (exactly once, no provider retry) ─────────────
  const { toolResults, actionsPerformed } = await runActionPhase(toolCalls, userId, chatId);

  // ── Phase C: Final response streaming ───────────────────────────────────────
  const followUpMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    ...baseMessages,
    { role: "assistant", content: choice.message.content, tool_calls: toolCalls },
    ...toolResults.map(
      (r): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
        role: "tool",
        tool_call_id: r.toolCallId,
        content: JSON.stringify(r.ok ? r.result : { error: r.result }),
      }),
    ),
  ];

  try {
    const { reply, provider: responseProvider } = await runResponsePhase(
      providers,
      followUpMessages,
      onToken,
    );
    aiProvider.markConnected(responseProvider.providerName);
    return { reply, actions: actionsPerformed };
  } catch (err) {
    // Actions already committed — report them even if the response failed.
    const { userMessage } = aiProvider.classifyError(err, "none");
    const reply = `Your actions were saved, but I couldn't generate a response: ${userMessage}`;
    onToken?.(reply);
    return { reply, actions: actionsPerformed };
  }
}
