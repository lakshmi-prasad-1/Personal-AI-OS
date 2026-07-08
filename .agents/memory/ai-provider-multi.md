---
name: Multi-provider AI setup
description: Gemini/Groq/OpenAI fallback pipeline — architecture decisions and gotchas
---

# Multi-provider AI setup

## Rule
The pipeline has three distinct phases: **A (intent/LLM)**, **B (action/DB writes)**, **C (response/LLM)**. Phases A and C retry across providers. Phase B runs exactly once — never retried — to prevent duplicate DB writes.

**Why:** If B retried across providers, a failed stream after a successful DB write would re-execute the same tool calls (duplicate notes, tasks, reminders, etc.).

## Provider priority
Gemini (`gemini-2.0-flash`) → Groq (`llama-3.3-70b-versatile`) → OpenAI (`gpt-4o-mini`).
Configured in `PROVIDER_CONFIGS` array in `artifacts/api-server/src/ai/aiProvider.ts`.

## Key API contracts
- `aiProvider.getAllProviders()` — returns all configured handles in priority order.
- `aiProvider.classifyError(err, providerName)` — returns `{ withinProviderRetryable }` (for same-provider retry in `withRetry`). The pipeline ALWAYS tries the next provider regardless of this flag.
- `aiProvider.markConnected(providerName)` — always updates state (including providerName) to reflect the actual active provider.

## How to apply
- Any new LLM call in the pipeline that is read-only should be placed in Phase A or C and passed `providers` for iteration.
- Any new DB write triggered by an AI tool call belongs in Phase B and must not be retried across providers.
- Auth/quota errors on one provider do not stop the pipeline — the next provider is always attempted.
