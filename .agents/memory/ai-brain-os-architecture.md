---
name: AI Brain OS Phase 1A architecture
description: What already exists in the AI Brain OS app (artifacts/api-server + artifacts/ai-brain-os) before assuming something needs to be built from scratch.
---

The "AI Brain OS" app already implements a full Intent -> Context -> Decision -> Action -> Response
AI pipeline, not just plain CRUD + chat. Before implementing anything from a "Phase 1A" style spec,
audit first — most of it is likely already built:

- Intent detection: OpenAI tool-calling in `artifacts/api-server/src/ai/chatPipeline.ts` + `toolDefinitions.ts`.
- Context retrieval: `artifacts/api-server/src/ai/contextEngine.ts` (pinned/recent notes, ideas, memories, resources).
- Action execution: `artifacts/api-server/src/ai/actionEngine.ts` (Zod-validated, calls services, never touches DB directly).
- Decision/recommendation heuristics: `artifacts/api-server/src/ai/decisionEngine.ts`.
- Long-term memory: `memories` table (importance/confidence scores), injected into system prompt by contextEngine — there is no separate "userFacts"/"preferences" table, memories table covers it.
- Knowledge graph auto-linking: `actionEngine.ts` calls `knowledgeGraphService.autoLink` on every note/idea/memory/resource creation (tokenizes + overlap score against existing nodes) — no manual graph maintenance needed.
- Every AI action is logged via `agentActionsService.ts` to an `agent_actions` table, surfaced on the dashboard's "Recent Activity" feed.
- Voice input already exists via browser `SpeechRecognition` in `artifacts/ai-brain-os/src/pages/chat.tsx` — feeds the exact same pipeline as typed text (no separate code path).
- Universal search backend (`searchService.ts`, ranked across notes/ideas/memories/resources/chats) existed but had NO frontend before this session — added a cmdk-based global search (Cmd+K) in `AppLayout.tsx` / `GlobalSearch.tsx` using the generated `useBrainSearch` hook.
- chatPipeline had no retry logic for transient OpenAI failures (429/5xx) — added a `withRetry` helper; quota errors (`insufficient_quota`) intentionally skip retry since they won't succeed on retry.

**Why this matters:** a large "continue Phase 1A" spec assumed most AI-OS architecture was missing; in reality only 2 of ~15 requirement areas had real gaps. Always audit before rebuilding.
