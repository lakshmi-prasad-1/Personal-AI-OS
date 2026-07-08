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
- AI provider keys (at least one required for AI features — tried in this priority order):
  - `GEMINI_API_KEY` — Google Gemini (primary, model: gemini-2.0-flash)
  - `GROQ_API_KEY` — Groq (fallback, model: llama-3.3-70b-versatile)
  - `OPENAI_API_KEY` — OpenAI (tertiary, model: gpt-4o-mini)
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

- `artifacts/ai-brain-os/src/pages/` — all page components (chat, dashboard, notes, ideas, memories, resources, graph, plus Phase 2A/3A/4 productivity, career, and Life OS pages)
- `artifacts/api-server/src/services/` — all business logic (notes/ideas/memories/resources/agentActions/knowledgeGraph/search/chat, plus productivity, career, and Life OS services)
- `artifacts/api-server/src/routes/` — thin Express route handlers
- `artifacts/api-server/src/ai/` — AI Core:
  - `toolDefinitions.ts` — OpenAI tool schemas (Intent Engine)
  - `contextEngine.ts` — gathers pinned/recent items into prompt summary
  - `decisionEngine.ts` — heuristic recommendations
  - `actionEngine.ts` — validates tool-call args, calls services, auto-links knowledge graph
  - `chatPipeline.ts` — orchestrates context → OpenAI → execute → respond
- `lib/db/src/schema/` — Drizzle schema (source of truth for all tables)
- `lib/api-spec/openapi.yaml` — source of truth for API contract (Phase 1 endpoints only — see Gotchas)
- `lib/api-client-react/` — generated React Query hooks + custom fetch (Phase 1 endpoints only)

## Architecture decisions

- **Services layer is the single source of truth.** REST routes and AI tool-call actions both call the same service functions.
- **Intent detection is LLM tool-calling, not keyword matching.** `toolDefinitions.ts` exposes typed tools; the model decides which to call.
- **Knowledge graph is auto-maintained.** `knowledgeGraphService.autoLink` creates nodes and links via keyword-overlap scoring.
- **Voice input reuses the text pipeline.** Mic button transcribes via browser Web Speech API and feeds the same `handleSend` pipeline.
- **Every AI action is logged to `agent_actions`.** Powers the Activity Timeline and provides an audit trail.
- **Multi-provider AI with automatic fallback.** `aiProvider.ts` tries Gemini → Groq → OpenAI in order. The pipeline (Phase A intent, Phase B actions, Phase C response) is structured so tool-call DB writes in Phase B execute exactly once and are never retried across providers.

## Product

- **Chat** (`/`): talk to the assistant by typing or speaking; creates notes, ideas, memories, resources, searches, and gives recommendations via natural conversation.
- **Overview** (`/dashboard`): read-only snapshot — knowledge graph stats, AI suggestions, recent activity timeline.
- **Notes / Ideas / Memories / Resources**: manual CRUD pages, also fully addressable by the AI.
- **Knowledge Graph** (`/graph`): visualizes auto-created nodes and edges.
- **Productivity OS** (Phase 2A): Tasks, Goals, Habits, Focus sessions, Reminders, Planner (with AI auto-generate daily/weekly/monthly), Reviews.
- **Career OS** (Phase 3A): career profile, applications, skills, and related tracking pages.
- **Life OS** (Phase 4): `/life-profile`, `/timeline`, `/insights`, `/analytics`, `/command-center` (Life Decision Engine), `/ai-settings`, `/automation` (interfaces only — no real automation execution, that's Phase 5), `/system-health`, `/activity-center` (reuses the existing `/brain/activity` endpoint).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `artifacts/api-server` needs `zod` as its own direct dependency (not just transitively) for `zod/v4` subpath imports to resolve under pnpm's isolated node_modules.
- The Vite dev server (port 5173) proxies `/api` → `http://localhost:8080`. This proxy is only active in dev; production uses artifact-level path routing.
- If `OPENAI_API_KEY` is missing or rate-limited, the chat pipeline degrades gracefully (fallback message, user message still persisted) — by design.
- **OpenAPI/codegen only covers Phase 1 endpoints.** All Phase 2A/3A/4 modules (productivity, career, Life OS) intentionally skip `lib/api-spec/openapi.yaml` and the generated `@workspace/api-client-react` hooks — their pages call `apiGet/apiPost/apiPatch/apiDelete` from `@/lib/api` directly. This is the established convention for everything added after Phase 1; don't regenerate codegen for these routes.
- Typecheck across the repo shows pre-existing noise unrelated to any single change: TS6305 "output not built" errors for `lib/db`/`lib/api-client-react` (stale dist, no build step wired into typecheck) and TS7006 implicit-any errors in several older files. These predate Phase 4 work — verify new code doesn't add to the count rather than expecting a fully clean run.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
