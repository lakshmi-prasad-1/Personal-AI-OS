import type OpenAI from "openai";

/**
 * These tool definitions ARE the Intent Engine: instead of hardcoded keyword
 * matching, the LLM decides which structured action (if any) matches the
 * user's message and extracts arguments for it. Every tool maps 1:1 to a
 * shared service so REST routes and AI actions never diverge.
 */
export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a note when the user wants to capture a thought, fact, or piece of information to keep.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short descriptive title" },
          content: { type: "string", description: "Full note content" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_idea",
      description: "Create an idea when the user shares a new idea, plan, or concept they want tracked.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          category: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_memory",
      description:
        "Store a long-term memory when the user says something like 'remember that...' — preferences, goals, facts about themselves, or important decisions that should influence future responses.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string", description: "e.g. preference, goal, decision, study, career" },
          importanceScore: { type: "integer", description: "0-100, how important this memory is" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_resource",
      description: "Save a resource (link, article, roadmap, reference material) when the user wants to save something for later.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description:
        "Search the user's notes, ideas, memories, resources, knowledge graph, and past chat history. Use this whenever the user asks to find, show, or recall something they previously stored.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recommendations",
      description:
        "Get proactive recommendations/next-best-actions based on the user's current notes, ideas, memories and resources. Use when the user asks what to do next, what to study, or for suggestions.",
      parameters: { type: "object", properties: {} },
    },
  },
];
