import OpenAI from "openai";
import { logger } from "../lib/logger";

const openaiApiKey = process.env["OPENAI_API_KEY"];
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export type ExplainMode = "simple" | "deep" | "examples" | "interview" | "coding" | "exam" | "step_by_step" | "compare" | "analogy" | "default";

const MODE_INSTRUCTIONS: Record<ExplainMode, string> = {
  simple: "Explain this as simply as possible, like to a beginner. Avoid jargon.",
  deep: "Give a deep, thorough, technically rigorous explanation covering edge cases and underlying theory.",
  examples: "Explain with 2-3 concrete worked examples.",
  interview: "Explain from a technical interview perspective — what an interviewer expects to hear, common follow-up questions.",
  coding: "Explain from a programming/coding perspective with a code snippet if relevant.",
  exam: "Explain in exam-answer style — structured, concise, with the key points an examiner looks for.",
  step_by_step: "Teach this step by step, building up from fundamentals to the full concept.",
  compare: "Compare and contrast this concept with closely related concepts, in a table if useful.",
  analogy: "Explain using a memorable real-world analogy.",
  default: "Explain clearly and helpfully.",
};

export const teacherService = {
  /**
   * AI Teacher: explains a topic through whichever lens the user asked for
   * (simple / deep / examples / interview / coding / exam / step-by-step /
   * compare / analogy). Same OpenAI client as the rest of the AI pipeline —
   * degrades gracefully if no key is configured.
   */
  async explain(params: { topic: string; mode?: ExplainMode; context?: string }): Promise<string> {
    const { topic, mode = "default", context } = params;
    if (!openai) {
      return `AI Teacher requires OPENAI_API_KEY to be configured. You asked to explain "${topic}" (${mode} mode).`;
    }
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert, encouraging AI teacher inside a student's study operating system. ${MODE_INSTRUCTIONS[mode]} Keep the response focused and well-formatted with short paragraphs or bullet points.`,
          },
          { role: "user", content: `${context ? `Context: ${context}\n\n` : ""}Explain: ${topic}` },
        ],
      });
      return completion.choices[0]?.message.content ?? "I couldn't generate an explanation right now.";
    } catch (err) {
      logger.error({ err }, "AI Teacher explain failed");
      return "Sorry, I couldn't generate an explanation right now — please try again.";
    }
  },

  async recommendResources(topic: string): Promise<{ videos: string[]; docs: string[] }> {
    if (!openai) return { videos: [], docs: [] };
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: 'Respond ONLY with JSON: { "videos": string[], "docs": string[] } — suggest realistic search queries/titles for YouTube videos and documentation the student could look up (not fake URLs).' },
          { role: "user", content: `Topic: ${topic}` },
        ],
      });
      const raw = completion.choices[0]?.message.content ?? "{}";
      return JSON.parse(raw) as { videos: string[]; docs: string[] };
    } catch (err) {
      logger.error({ err }, "AI resource recommendation failed");
      return { videos: [], docs: [] };
    }
  },
};
