---
name: Phase 4 Life OS expansion
description: Life Profile/Timeline/Insights/Analytics/Decision Engine/AI Settings/Automation/System Health modules layered on top of Phase 1-3; conventions to follow for any further expansion.
---

Phase 4 added a "Life OS" layer (life profile, timeline, insights, analytics, life decision engine/command-center, AI settings, automation interfaces, system health, activity center) on top of the existing Phase 1 (core brain), Phase 2A (productivity), and Phase 3A (career) modules.

**Frontend/backend wiring convention diverges from Phase 1.** Phase 1 pages use generated `@workspace/api-client-react` hooks from the OpenAPI spec. Every module added since Phase 2A (productivity, career, and now Life OS) intentionally bypasses `lib/api-spec/openapi.yaml` and codegen — pages call `apiGet/apiPost/apiPatch/apiDelete` from `@/lib/api` directly with `useQuery`/`useMutation`.

**Why:** This was the established precedent set in Phase 2A/3A (confirmed by inspecting `tasks.tsx`, `study-profile.tsx` before building Phase 4) — adding OpenAPI entries for every new module would mean maintaining two contract systems in parallel with no clear benefit, since the hand-written fetch wrappers already give type safety via Zod schemas defined alongside the services.

**How to apply:** When adding new modules/endpoints in future phases, keep using `apiGet/apiPost/apiPatch/apiDelete` + hand-written route files (`Router()` + `requireAuth` + zod safeParse) rather than extending the OpenAPI spec, unless the user explicitly asks to unify the API contract system.

**Automation module is interfaces-only by design** — no real automation execution or external API calls (deferred to Phase 5). Don't wire real triggers/actions into `automationService.ts` without explicit instruction.

**Typecheck noise is repo-wide and pre-existing**, not something to chase to zero: `TS6305` "output not built" errors for `lib/db`/`lib/api-client-react` dist (those packages have no build step wired into the typecheck flow) and `TS7006` implicit-any in several older service/page files (careerAnalyticsService, habitService, taskService, reviewService, quizService, knowledgeGraphService, productivityAnalyticsService, contextEngine, and a few Phase 1 pages). When verifying new work, diff the error list against this known set rather than expecting a fully clean `tsc` run.
