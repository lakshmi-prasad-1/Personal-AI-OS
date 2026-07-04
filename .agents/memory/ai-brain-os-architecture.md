---
name: AI Brain OS Phase 1A architecture
description: What already exists in the AI Brain OS app (artifacts/api-server + artifacts/ai-brain-os) before assuming something needs to be built from scratch.
---

The "AI Brain OS" app already implements a full Intent -> Context -> Decision -> Action -> Response
AI pipeline, not just plain CRUD + chat. Before implementing anything from a "Phase 1A/1B" style spec,
audit first — most of it is likely already built:

- Intent detection: OpenAI tool-calling in `artifacts/api-server/src/ai/chatPipeline.ts` + `toolDefinitions.ts`.
- Context retrieval: `artifacts/api-server/src/ai/contextEngine.ts` — now calls domain services (notesService/ideasService/memoriesService/resourcesService) instead of raw DB queries, so retrieval logic never diverges from REST routes.
- Action execution: `artifacts/api-server/src/ai/actionEngine.ts` (Zod-validated, calls services, never touches DB directly).
- Decision/recommendation heuristics: `artifacts/api-server/src/ai/decisionEngine.ts` — also refactored to use domain services.
- Long-term memory: `memories` table (importance/confidence scores, free-text `category` field guided by tool description e.g. preference/goal/decision/study/career) injected into system prompt by contextEngine.
- Knowledge graph auto-linking: moved from route handlers into each domain service's `create()` (notesService/ideasService/memoriesService/resourcesService) so REST and AI actionEngine share one code path — do not add `knowledgeGraphService.autoLink` calls anywhere else, it's now owned by the service layer.
- Every AI action is logged via `agentActionsService.ts` to an `agent_actions` table, surfaced on the dashboard's "Recent Activity" feed.
- Voice input already exists via browser `SpeechRecognition` in `artifacts/ai-brain-os/src/pages/chat.tsx` — feeds the exact same pipeline as typed text (no separate code path).
- Universal search (`searchService.ts`) covers notes/ideas/memories/resources/chat AND knowledge graph nodes (`graph_node` result type) — ranked by keyword overlap scoring.
- `authService.ts` and `usersService.ts` hold all user/credential DB logic; `routes/auth.ts` and `routes/users.ts` must stay thin (no direct `db` imports).
- chatPipeline has retry logic (`withRetry`) for transient OpenAI failures (429/5xx); `insufficient_quota` errors intentionally skip retry.

**Why this matters:** repeated "audit and verify Phase 1A" specs keep re-discovering the same handful of gaps (duplicate autoLink logic in routes+actionEngine, raw DB queries in decisionEngine/contextEngine/auth routes, missing graph-node search). These have now been fixed at the root (moved into services) — don't reintroduce them by adding autoLink calls back into routes or actionEngine, or by adding raw db.select() calls to ai/*.ts files.

**Known env constraint:** the workspace's OpenAI API key frequently hits `insufficient_quota` (429) — this blocks any chat/AI e2e testing. When this happens, verify pipeline logic via direct REST API calls (curl) to the domain endpoints instead of relying on the chat UI, since REST routes and AI actionEngine now share the exact same service layer.

**Status/priority casing mismatch:** free-text `status`/`priority` columns (e.g. `ideas.status`, `ideas.priority`) have no DB-level enum, and layers disagree on casing — DB column defaults are lowercase (`"new"`, `"medium"`) but the frontend UI writes/reads uppercase (`"DRAFT"`, `"HIGH"`). This silently broke `decisionEngine.ts`'s case-sensitive `===` filters against real UI-created ideas (recommendation category appeared dead despite correct-looking code). Any new server-side filter/comparison against these free-text fields must `.toLowerCase()` both sides — don't trust a curl payload that happens to match the code's assumed casing; verify against a real UI-created record.
