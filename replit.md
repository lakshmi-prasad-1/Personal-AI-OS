# AI Brain OS

An AI-first "second brain" app: talk to an assistant (by text or voice), and it creates notes, ideas, memories, and resources, automatically linking them into a knowledge graph — all through natural conversation instead of manual forms.

## Run & Operate

- **Frontend** — `Start application` workflow: `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/ai-brain-os run dev`
- **API Server** — `API Server` workflow: `PORT=8080 pnpm --filter @workspace/api-server run dev`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (run after editing `lib/api-spec/openapi.yaml`)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Replit built-in PostgreSQL (auto-provisioned)
- Optional env: `OPENAI_API_KEY` — enables AI chat pipeline (tool-calling). Without it, chat degrades gracefully.
- `SESSION_SECRET` — used for JWT signing

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080)
- Frontend: React + Vite (port 5173), proxies `/api` to port 8080
- DB: PostgreSQL + Drizzle ORM (Replit built-in)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- AI: OpenAI tool-calling (`openai` SDK), browser Web Speech API for voice input

## Where things live

- `artifacts/ai-brain-os/src/pages/` — all page components (chat, dashboard, notes, ideas, memories, resources, graph)
- `artifacts/api-server/src/services/` — all business logic (notes/ideas/memories/resources/agentActions/knowledgeGraph/search/chat)
- `artifacts/api-server/src/routes/` — thin Express route handlers
- `artifacts/api-server/src/ai/` — AI Core:
  - `toolDefinitions.ts` — OpenAI tool schemas (Intent Engine)
  - `contextEngine.ts` — gathers pinned/recent items into prompt summary
  - `decisionEngine.ts` — heuristic recommendations
  - `actionEngine.ts` — validates tool-call args, calls services, auto-links knowledge graph
  - `chatPipeline.ts` — orchestrates context → OpenAI → execute → respond
- `lib/db/src/schema/` — Drizzle schema (source of truth for all tables)
- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/` — generated React Query hooks + custom fetch

## Architecture decisions

- **Services layer is the single source of truth.** REST routes and AI tool-call actions both call the same service functions.
- **Intent detection is LLM tool-calling, not keyword matching.** `toolDefinitions.ts` exposes typed tools; the model decides which to call.
- **Knowledge graph is auto-maintained.** `knowledgeGraphService.autoLink` creates nodes and links via keyword-overlap scoring.
- **Voice input reuses the text pipeline.** Mic button transcribes via browser Web Speech API and feeds the same `handleSend` pipeline.
- **Every AI action is logged to `agent_actions`.** Powers the Activity Timeline and provides an audit trail.

## Product

- **Chat** (`/`): talk to the assistant by typing or speaking; creates notes, ideas, memories, resources, searches, and gives recommendations via natural conversation.
- **Overview** (`/dashboard`): read-only snapshot — knowledge graph stats, AI suggestions, recent activity timeline.
- **Notes / Ideas / Memories / Resources**: manual CRUD pages, also fully addressable by the AI.
- **Knowledge Graph** (`/graph`): visualizes auto-created nodes and edges.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `artifacts/api-server` needs `zod` as its own direct dependency (not just transitively) for `zod/v4` subpath imports to resolve under pnpm's isolated node_modules.
- The Vite dev server (port 5173) proxies `/api` → `http://localhost:8080`. This proxy is only active in dev; production uses artifact-level path routing.
- If `OPENAI_API_KEY` is missing or rate-limited, the chat pipeline degrades gracefully (fallback message, user message still persisted) — by design.
- Schema is intentionally prepared for future Tasks/Planner/Goals/Habits/Study/Career modules but those are NOT implemented yet.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
