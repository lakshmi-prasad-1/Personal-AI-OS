# AI Brain OS

An AI-first "second brain" app: you talk to an assistant (by text or voice), and it creates notes, ideas, memories, and resources for you, automatically linking them into a knowledge graph — all through natural conversation instead of manual forms.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/ai-brain-os run dev` — run the web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (run after editing `lib/api-spec/openapi.yaml`)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `OPENAI_API_KEY` — enables the AI chat pipeline (tool-calling). Without it, or if the key is rate-limited/out of quota, the chat pipeline gracefully falls back to an apologetic message and still saves the user's message — it never loses input or crashes.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- AI: OpenAI tool-calling (`openai` SDK), browser Web Speech API for voice input (no extra dependency/cost)

## Where things live

- `artifacts/api-server/src/services/` — all business logic (notes/ideas/memories/resources/agentActions/knowledgeGraph/search/chat). REST routes and AI actions both call into these services so logic is never duplicated.
- `artifacts/api-server/src/routes/` — thin Express route handlers; validate with Zod, call services, shape responses.
- `artifacts/api-server/src/ai/` — the AI Core:
  - `toolDefinitions.ts` — OpenAI tool schemas (the "Intent Engine"; the LLM decides which tool to call, no hardcoded keyword matching)
  - `contextEngine.ts` — gathers pinned/recent notes, ideas, memories, resources into a prompt summary
  - `decisionEngine.ts` — heuristic recommendations, shared by `/brain/decide` and the `get_recommendations` tool
  - `actionEngine.ts` — validates tool-call args with Zod, calls services, auto-links the knowledge graph, logs every action to `agent_actions`
  - `chatPipeline.ts` — orchestrates: gather context → call OpenAI with tools → execute tool calls via actionEngine → stream final response; falls back gracefully on any failure
- `lib/db/src/schema/` — Drizzle schema; source of truth for all tables, including `agentActions.ts` (the activity log feeding the Activity Timeline)
- `lib/api-spec/openapi.yaml` — source of truth for the API contract; run codegen after editing
- `artifacts/ai-brain-os/src/pages/chat.tsx` — home page; text + voice (mic button, browser `SpeechRecognition`) both feed the same `handleSend` pipeline
- `artifacts/ai-brain-os/src/pages/dashboard.tsx` — read-only "Overview" page (stats, AI suggestions, recent activity, recently updated items) — no creation shortcuts

## Architecture decisions

- **Services layer is the single source of truth for business logic.** REST routes and AI tool-call actions both call the same service functions (e.g. `notesService.create`), so behavior never diverges between "clicking a button" and "asking the AI to do it."
- **Intent detection is LLM tool-calling, not keyword matching.** `toolDefinitions.ts` exposes typed tools (create_note, create_idea, create_memory, create_resource, search_knowledge, get_recommendations); the model decides which to call based on natural language.
- **Knowledge graph is auto-maintained.** `knowledgeGraphService.autoLink` creates a node for every new note/idea/memory/resource and links it to existing nodes via keyword-overlap scoring — no manual graph curation required.
- **Voice input reuses the text pipeline.** The mic button transcribes speech client-side via the browser's Web Speech API and populates the same input state as typing, so there is exactly one code path from "user expresses intent" to "message sent."
- **Chat is the home page (`/`); Dashboard moved to `/dashboard`.** Dashboard is intentionally read-only/informational (stats, recent activity, suggestions) — all creation happens through the AI chat, never through dashboard shortcuts.
- **Every AI action is logged to `agent_actions`.** This powers the Activity Timeline on the Overview page and gives an audit trail independent of whatever entity was created/modified.

## Product

- Chat (home page): talk to the assistant by typing or speaking (mic button); it can create notes, ideas, memories, and resources, search across everything you've saved, and give recommendations — all via natural conversation.
- Overview (`/dashboard`): read-only snapshot — knowledge graph stats, AI suggestions, recent AI activity timeline, and recently updated items across all modules.
- Notes / Ideas / Memories / Resources: manual CRUD pages, also fully addressable by the AI.
- Knowledge Graph (`/graph`): visualizes nodes/edges auto-created as you and the AI add content.
- Universal ranked search across notes, ideas, memories, resources, and chat history (`/brain/search`, also exposed to the AI as the `search_knowledge` tool).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `artifacts/api-server` needs `zod` as its own direct dependency (not just transitively via `@workspace/db`/`@workspace/api-zod`) for `zod/v4` subpath imports to resolve under pnpm's isolated node_modules.
- If `OPENAI_API_KEY` is missing, rate-limited, or out of quota, the chat pipeline degrades gracefully (fallback message, user message still persisted) instead of failing the request — this is by design, not a bug.
- Schema is intentionally prepared for future Tasks/Planner/Goals/Habits/Study/Career modules but those are NOT implemented yet (explicitly out of scope for this phase), along with Resume/ATS/Job Tracking/Browser Automation/n8n/Telegram/Calendar/Email/Notifications/Voice Output/Mobile App.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
