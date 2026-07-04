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

  // ─── Study Profile & Subjects (Phase 2B: Study OS) ─────────────────────
  {
    type: "function",
    function: {
      name: "update_study_profile",
      description: "Update the user's study profile (semester, branch, study goals, learning style, skills, weak/strong subjects).",
      parameters: {
        type: "object",
        properties: {
          semester: { type: "string" },
          branch: { type: "string" },
          dailyStudyGoalMinutes: { type: "integer" },
          preferredStudyTime: { type: "string" },
          preferredLearningStyle: { type: "string" },
          preferredRevisionStyle: { type: "string" },
          weakSubjects: { type: "array", items: { type: "string" } },
          strongSubjects: { type: "array", items: { type: "string" } },
          programmingLanguages: { type: "array", items: { type: "string" } },
          currentSkills: { type: "array", items: { type: "string" } },
          targetSkills: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_subject",
      description: "Add a subject/course the user is studying this semester.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          code: { type: "string" },
          semester: { type: "string" },
          category: { type: "string", enum: ["core", "elective", "lab", "project"] },
          examDate: { type: "string", description: "YYYY-MM-DD" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_subjects",
      description: "List the user's subjects/courses with their progress.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_topic",
      description: "Add a topic/chapter under a subject the user needs to study.",
      parameters: {
        type: "object",
        properties: {
          subjectName: { type: "string", description: "Name of the subject this topic belongs to" },
          title: { type: "string" },
          description: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          importance: { type: "string", enum: ["low", "medium", "high"] },
          estimatedHours: { type: "integer" },
        },
        required: ["subjectName", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_topic_status",
      description: "Mark a topic's study status, e.g. when the user says they finished studying a topic or need to revise it.",
      parameters: {
        type: "object",
        properties: {
          topicTitle: { type: "string" },
          status: { type: "string", enum: ["not_started", "in_progress", "completed", "revision_needed"] },
        },
        required: ["topicTitle", "status"],
      },
    },
  },

  // ─── Flashcards ─────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "generate_flashcards",
      description: "Generate AI flashcards for a topic or subject the user wants to memorize/revise.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic or subject name to generate flashcards about" },
          count: { type: "integer", description: "Number of flashcards, default 5" },
          type: { type: "string", enum: ["definition", "concept", "formula", "programming", "revision"] },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_flashcards_due",
      description: "List flashcards due for spaced-repetition review today. Use when the user asks 'what flashcards should I review?'",
      parameters: { type: "object", properties: {} },
    },
  },

  // ─── Quizzes ────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "generate_quiz",
      description: "Generate an AI quiz to test the user's knowledge on a topic or subject.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          count: { type: "integer", description: "Number of questions, default 5" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard", "adaptive"] },
        },
        required: ["topic"],
      },
    },
  },

  // ─── Revision & weak topics ─────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_revision_recommendation",
      description: "Get a 'what should I revise today' recommendation combining due flashcards, weak topics, and topics flagged for revision.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weak_topics",
      description: "List topics the user is struggling with (weak topics), based on quiz performance and flagged difficulty.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "log_study_session",
      description: "Log a completed study/revision/practice session with duration, e.g. when the user says they studied for X minutes.",
      parameters: {
        type: "object",
        properties: {
          subjectName: { type: "string" },
          durationMinutes: { type: "integer" },
          type: { type: "string", enum: ["study", "revision", "practice", "coding"] },
          notes: { type: "string" },
        },
        required: ["durationMinutes"],
      },
    },
  },

  // ─── AI Teacher ─────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "explain_topic",
      description:
        "Act as an AI teacher and explain a concept/topic to the user. Use when the user asks to explain, teach, or clarify something academic — pick the mode from how they phrased it (simple, deep, with examples, for an interview, with code, exam-style, step by step, comparison, or analogy).",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          mode: { type: "string", enum: ["simple", "deep", "examples", "interview", "coding", "exam", "step_by_step", "compare", "analogy", "default"] },
        },
        required: ["topic"],
      },
    },
  },

  // ─── Study recommendation ───────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_study_recommendation",
      description: "Get a proactive 'what should I study right now' recommendation based on exam dates, weak topics, and due revisions.",
      parameters: { type: "object", properties: {} },
    },
  },

  // ─── Career Profile (Phase 3A: Career OS) ──────────────────────────────
  {
    type: "function",
    function: {
      name: "update_career_profile",
      description: "Update the user's career profile: education, preferred roles/companies/locations, expected salary, work type, soft skills, certificates, achievements, or profile links (GitHub, LinkedIn, LeetCode etc).",
      parameters: {
        type: "object",
        properties: {
          degree: { type: "string" },
          university: { type: "string" },
          currentSemester: { type: "string" },
          graduationYear: { type: "string" },
          preferredRoles: { type: "array", items: { type: "string" } },
          preferredCompanies: { type: "array", items: { type: "string" } },
          preferredLocations: { type: "array", items: { type: "string" } },
          expectedSalary: { type: "string" },
          preferredWorkTypes: { type: "array", items: { type: "string" }, description: "internship, full_time, remote, hybrid" },
          softSkills: { type: "array", items: { type: "string" } },
          certificates: { type: "array", items: { type: "string" } },
          achievements: { type: "array", items: { type: "string" } },
          githubUrl: { type: "string" },
          linkedinUrl: { type: "string" },
          leetcodeUrl: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_skill",
      description: "Add or update a skill in the user's skill inventory, e.g. when they say 'I learned Docker' or 'I'm good at React'.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string", enum: ["programming_language", "framework", "library", "database", "cloud", "devops", "ai_ml", "dsa", "system_design", "soft_skill", "other"] },
          level: { type: "string", enum: ["beginner", "intermediate", "advanced", "expert"] },
          confidence: { type: "integer", description: "0-100" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_project",
      description: "Add a project to the user's project portfolio when they describe something they built.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          techStack: { type: "array", items: { type: "string" } },
          githubUrl: { type: "string" },
          demoUrl: { type: "string" },
          status: { type: "string", enum: ["planning", "in_progress", "completed", "archived"] },
          role: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_career_goal",
      description: "Add a career goal (short or long term), e.g. target company/role, or a roadmap milestone.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          type: { type: "string", enum: ["short_term", "long_term"] },
          targetCompanies: { type: "array", items: { type: "string" } },
          targetRoles: { type: "array", items: { type: "string" } },
          targetTechnologies: { type: "array", items: { type: "string" } },
          targetDate: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_resume",
      description: "Run AI resume analysis (Resume AI) on one of the user's saved resumes — detects weaknesses, missing skills/keywords, and ATS friendliness. Never overwrites the resume.",
      parameters: {
        type: "object",
        properties: { resumeTitle: { type: "string", description: "Title of the resume to analyze" } },
        required: ["resumeTitle"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_career_recommendation",
      description: "Get AI Career Coach recommendations: what to learn next, resume improvements, interview readiness, project suggestions, progress toward career goals.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "show_career_progress",
      description: "Show the user's overall career dashboard: resume status, top skills, skill gaps, projects, interview readiness, and career goals.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "start_mock_interview",
      description: "Start a mock interview by generating the first question of a given type (technical, behavioral, hr, coding, project_discussion, resume_discussion).",
      parameters: {
        type: "object",
        properties: { type: { type: "string", enum: ["technical", "behavioral", "hr", "coding", "project_discussion", "resume_discussion"] } },
        required: ["type"],
      },
    },
  },

  // ─── Career OS extended tools ────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "analyze_job_description",
      description: "Analyze a job description: extract role, company, required skills, technologies, and compare against the user's resume/skills to show a match score, missing skills, and learning priorities. Use when the user pastes a JD or asks to compare a job with their profile.",
      parameters: {
        type: "object",
        properties: {
          jobDescription: { type: "string", description: "The full job description text" },
          company: { type: "string", description: "Company name if known" },
          role: { type: "string", description: "Role/job title if known" },
        },
        required: ["jobDescription"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "track_application",
      description: "Add a job application to the Application Tracker. Use when the user says they applied to a company, or wants to track a job application.",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          status: { type: "string", enum: ["applied", "screening", "interview", "assessment", "offer", "rejected", "withdrawn"] },
          appliedDate: { type: "string", description: "YYYY-MM-DD" },
          deadline: { type: "string", description: "YYYY-MM-DD" },
          jobUrl: { type: "string" },
          notes: { type: "string" },
          salary: { type: "string" },
          location: { type: "string" },
          workType: { type: "string", enum: ["remote", "hybrid", "onsite"] },
        },
        required: ["company", "role"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_company",
      description: "Add a company to the Company Tracker for research and monitoring. Use when the user mentions a target/dream company they want to track.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          website: { type: "string" },
          industry: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "dream"] },
          notes: { type: "string" },
          status: { type: "string", enum: ["researching", "applied", "interviewing", "offer", "rejected", "not_interested"] },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_career_roadmap",
      description: "Generate a personalized career roadmap for a target role (e.g. Frontend, Backend, Full Stack, AI Engineer, ML Engineer, Cloud, Cyber Security). Includes skills, projects, certifications, timeline, and weekly/monthly goals.",
      parameters: {
        type: "object",
        properties: {
          targetRole: { type: "string", description: "The role to generate a roadmap for, e.g. 'Full Stack Developer', 'AI Engineer'" },
          currentLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"], description: "User's current level" },
          timelineMonths: { type: "integer", description: "Target timeline in months (default 6)" },
        },
        required: ["targetRole"],
      },
    },
  },
];
