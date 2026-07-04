import type OpenAI from "openai";

/**
 * These tool definitions ARE the Intent Engine: instead of hardcoded keyword
 * matching, the LLM decides which structured action (if any) matches the
 * user's message and extracts arguments for it. Every tool maps 1:1 to a
 * shared service so REST routes and AI actions never diverge.
 */
export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  // ─── Knowledge tools (Phase 1) ──────────────────────────────────────────
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
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recommendations",
      description:
        "Get proactive recommendations/next-best-actions based on the user's productivity context. Use when the user asks what to do next, what to study, or for suggestions.",
      parameters: { type: "object", properties: {} },
    },
  },

  // ─── Task tools (Phase 2A) ───────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Create a task when the user mentions something they need to do, an assignment, a deadline, or any actionable item. Extract due date and priority from context.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Clear, actionable task title" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          category: { type: "string", description: "e.g. study, work, project, personal, health" },
          dueDate: { type: "string", description: "YYYY-MM-DD format, infer from context (e.g. 'Friday')" },
          dueTime: { type: "string", description: "HH:MM format" },
          estimatedMinutes: { type: "integer", description: "Estimated time to complete in minutes" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark a task as done when the user says they finished or completed something.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "ID of the task to complete" },
          taskTitle: { type: "string", description: "Title to help identify the task if ID is unknown" },
        },
        required: ["taskTitle"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List the user's tasks. Use when asked to show tasks, what's pending, what needs to be done today, etc.",
      parameters: {
        type: "object",
        properties: {
          filter: { type: "string", enum: ["all", "today", "upcoming", "done"], description: "Filter tasks by scope" },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update task details like due date, priority, or status.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          taskTitle: { type: "string", description: "Title to identify the task" },
          updates: {
            type: "object",
            properties: {
              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
              status: { type: "string", enum: ["todo", "in_progress", "done", "archived"] },
              dueDate: { type: "string" },
              description: { type: "string" },
            },
          },
        },
        required: ["taskTitle"],
      },
    },
  },

  // ─── Goal tools ──────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Create a long-term or short-term goal when the user describes something they want to achieve.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string", description: "e.g. career, learning, health, project, finance" },
          type: { type: "string", enum: ["short_term", "long_term"] },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          targetDate: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_goal_progress",
      description: "Update the progress percentage of a goal or mark it complete.",
      parameters: {
        type: "object",
        properties: {
          goalTitle: { type: "string" },
          progressPercent: { type: "integer", description: "0-100" },
          completed: { type: "boolean" },
        },
        required: ["goalTitle"],
      },
    },
  },

  // ─── Habit tools ─────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_habit",
      description: "Create a habit when the user wants to track a recurring behaviour like studying, coding, gym, reading.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          frequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_habit",
      description: "Log that a habit was completed today.",
      parameters: {
        type: "object",
        properties: {
          habitName: { type: "string", description: "Name of the habit to log" },
          completed: { type: "boolean" },
        },
        required: ["habitName"],
      },
    },
  },

  // ─── Reminder tools ───────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_reminder",
      description:
        "Create a reminder when the user wants to be reminded of something at a specific time. Parse natural language dates/times into ISO format.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string", description: "Optional detail" },
          remindAt: { type: "string", description: "ISO 8601 datetime string" },
          isRecurring: { type: "boolean" },
          recurringPattern: { type: "string", enum: ["daily", "weekly", "monthly"] },
        },
        required: ["title", "remindAt"],
      },
    },
  },

  // ─── Planner tools ────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "plan_day",
      description:
        "Create planner time blocks for a given day. Use when the user asks to plan their day, schedule sessions, or arrange their time.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD, default today" },
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                type: { type: "string", enum: ["study", "project", "coding", "college", "break", "free", "buffer", "custom"] },
                startTime: { type: "string", description: "HH:MM" },
                endTime: { type: "string", description: "HH:MM" },
                durationMinutes: { type: "integer" },
              },
              required: ["title"],
            },
          },
        },
        required: ["events"],
      },
    },
  },

  // ─── Focus tools ─────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "start_focus_session",
      description: "Start a focus or Pomodoro session when the user asks to focus, start a timer, or begin a work session.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "What the session is for" },
          type: { type: "string", enum: ["pomodoro", "deep_work", "study", "coding"] },
          plannedMinutes: { type: "integer", description: "Session length in minutes, default 25 for pomodoro" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "stop_focus_session",
      description: "Stop or complete the current active focus session.",
      parameters: { type: "object", properties: { notes: { type: "string" } } },
    },
  },

  // ─── Review tools ────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "generate_daily_review",
      description: "Generate or retrieve today's daily review summarising tasks, habits, focus time, and goals.",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "YYYY-MM-DD, default today" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_weekly_review",
      description: "Generate this week's productivity review.",
      parameters: { type: "object", properties: {} },
    },
  },

  // ─── Productivity query tools ─────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_productivity_summary",
      description:
        "Get a snapshot of today's productivity: tasks due, habits status, active goals, upcoming reminders, and focus stats. Use when asked 'what should I do today?', 'how am I doing?', 'what's pending?'",
      parameters: { type: "object", properties: {} },
    },
  },
];
