---
name: Phase 2A Productivity OS
description: Decisions, gotchas, and constraints from Phase 2A implementation (Tasks/Goals/Habits/Focus/Reminders/Planner/Reviews)
---

## What was built
7 DB schemas (tasks, goals, habits+habit_logs, focus_sessions, reminders, planner_events, daily_reviews+weekly_reviews), 7 services, 7 route files, 7 frontend pages, updated dashboard ("Today's Brain"), updated AppLayout with collapsible nav sections, updated App.tsx routing, updated AI pipeline (toolDefinitions, actionEngine, contextEngine).

## Key constraints

**KnowledgeGraphService entity types**: `LinkableEntityType = "note" | "idea" | "memory" | "resource"`. Do NOT pass `"task"` or `"goal"` to `knowledgeGraphService.autoLink()` — it won't compile. If you add graph support for tasks/goals, extend the type in `knowledgeGraphService.ts` first.
**Why:** The graph schema at DB level allows any string, but the service type is narrowed. Passing other entity types causes a TS compile error.

**Habit authorization**: `habitService.logToday` now verifies ownership (`WHERE id=habitId AND userId=userId`) before writing. `_recalcStreak` also scopes its UPDATE to `userId`. Maintain this pattern for any future habit mutations.
**Why:** Code review found a privilege escalation risk where any user with a known UUID could mutate another user's habit streak.

**`/tasks/today` returns ALL today's tasks (all statuses)** — done and pending — so the dashboard can compute completion percentages correctly. The internal `taskService.listDueToday()` only returns non-done tasks (used for AI context). The route overrides this for UI correctness.
**Why:** Dashboard needs done/total ratio; using only pending tasks made it always show "0 done".

## AI pipeline additions
- `toolDefinitions.ts`: 19 tools total (6 Phase 1 + 13 Phase 2A)
- `actionEngine.ts`: handles all 19 tools; uses `z.object()` not `z.record()` for updateTaskArgs (zod/v4 signature)
- `contextEngine.ts`: now gathers productivity context (today's tasks, active goals, habits, reminders, active focus session) alongside knowledge data

## Frontend API helper
`artifacts/ai-brain-os/src/lib/api.ts` — `apiFetch`, `apiGet`, `apiPost`, `apiPatch`, `apiDelete`. Reads JWT from localStorage key `ai_brain_os_token`. All Phase 2A pages use this instead of generated hooks.

## useBrainActivity() return shape
The hook returns a union type — safe access: `Array.isArray(activity) ? activity : (activity as any)?.actions ?? []`
**Why:** Depending on version, the response may be a bare array or `{ actions: [...] }`.
