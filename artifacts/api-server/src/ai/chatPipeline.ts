import OpenAI from "openai";
import { contextEngine } from "./contextEngine";
import { actionEngine, type ActionResult } from "./actionEngine";
import { chatTools } from "./toolDefinitions";
import { logger } from "../lib/logger";

const openaiApiKey = process.env["OPENAI_API_KEY"];
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const SYSTEM_PROMPT = `You are the AI inside AI Brain OS, a personal second-brain / AI operating system.

Core architecture: every user message (typed OR spoken via voice-to-text — treat them identically)
flows through you as Intent -> Context -> Decision -> Action -> Response.

You have tools that let you create notes, ideas, memories and resources, search the user's
knowledge base, and produce recommendations. Decide from the user's natural language whether
one or more tools should be called - never ask the user to fill out a form, just act naturally:
- "I have an assignment due tomorrow" / general facts to capture -> create_note or create_idea
- "Remember that ..." / lasting preferences, goals, decisions -> create_memory
- "Save this ..." / links, articles, reference material -> create_resource
- "What did I save/write about X", "find/show my ..." -> search_knowledge
- "What should I do/study/focus on" -> get_recommendations

Only call a tool when the user's message actually implies that action; for plain conversation,
questions, or when no data needs to change, just respond normally without calling a tool.
After a tool result comes back, weave it into a natural, concise, warm response — do not dump
raw JSON at the user. If a tool call fails, apologize briefly, explain simply, and keep going;
never lose track of what the user originally said.`;

export interface PipelineResult {
  reply: string;
  actions: { actionType: string; summary: string }[];
}

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * This is the AI-first pipeline described in the spec:
 *   Text/Voice input -> Intent Engine (tool-calling) -> Context Engine ->
 *   Action Engine (validated writes + graph auto-link + logging) -> Response.
 * Both keyboard and voice input hit this exact same function - there is no
 * separate voice code path.
 */
export async function runChatPipeline(params: {
  userId: string;
  chatId: string;
  history: HistoryMessage[];
  onToken?: (token: string) => void;
}): Promise<PipelineResult> {
  const { userId, chatId, history, onToken } = params;

  if (!openai) {
    const reply = "AI chat is not configured on this server (missing OPENAI_API_KEY). Your message was saved.";
    onToken?.(reply);
    return { reply, actions: [] };
  }

  const context = await contextEngine.gather(userId);
  const systemContent = context.summary
    ? `${SYSTEM_PROMPT}\n\nContext about this user:\n${context.summary}`
    : SYSTEM_PROMPT;

  const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
  ];

  const actionsPerformed: { actionType: string; summary: string }[] = [];

  try {
    // Step 1: non-streamed call so we can inspect for tool calls (Intent + Decision).
    const first = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: baseMessages,
      tools: chatTools,
      tool_choice: "auto",
    });

    const choice = first.choices[0];
    const toolCalls = choice?.message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      // No action needed - stream the direct response.
      const content = choice?.message.content ?? "";
      if (content) {
        onToken?.(content);
        return { reply: content, actions: [] };
      }
      // Fall back to a streamed completion if the first call had no content
      // (defensive - normally content is present when there are no tool calls).
      return streamFinal(baseMessages, onToken);
    }

    // Step 2: Action Engine executes every requested tool call.
    const toolResults: ActionResult[] = [];
    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      const result = await actionEngine.execute({
        userId,
        chatId,
        toolCallId: call.id,
        toolName: call.function.name,
        rawArgs: call.function.arguments,
      });
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

    return streamFinal(followUpMessages, onToken, actionsPerformed);
  } catch (err) {
    logger.error({ err }, "Chat pipeline failed");
    const fallback = "Sorry, something went wrong while thinking that through. Your message was saved — try again in a moment.";
    onToken?.(fallback);
    return { reply: fallback, actions: actionsPerformed };
  }
}

async function streamFinal(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  onToken?: (token: string) => void,
  actions: { actionType: string; summary: string }[] = [],
): Promise<PipelineResult> {
  if (!openai) return { reply: "", actions };

  let fullReply = "";
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    messages,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? "";
    if (token) {
      fullReply += token;
      onToken?.(token);
    }
  }

  return { reply: fullReply, actions };
}
