---
name: omp-runtime
description: Change or debug OMP RPC, SSE, transcript grouping, model capabilities and native permissions in this frontend. Use for behavior/data defects rather than visual-only work.
---

# Keep runtime state authoritative

Read [AGENTS.md](../../../AGENTS.md), [CAPABILITIES.md](../../../CAPABILITIES.md) and the relevant server/web state helpers. There is one agent runtime: OMP. The host presents and manages it.

## Trace an actual event

Follow the action through web/src/lib/api.ts, the API handler, OmpBridge, snapshot normalization, chat state and transcript rendering. Check the real protocol/capability evidence before adding a command or interpreting a field. Keep failed and unsupported operations visible instead of synthesizing success.

## Invariants

- Preserve native history and indices used by edits, checkpoints, file-change summaries and regenerated branches. Presentation grouping must not mutate stored messages or cross a user-turn boundary.
- Merge adjacent thinking fragments. Automatic todo reminders may belong inside the ongoing activity disclosure; final answer text stays outside it.
- Fast mode requires model priority support plus a compatible provider route. Permission selection reflects the native global default and launch overrides; opening the app never changes policy.
- Project labels/membership use shared/workspace.ts boundaries. Keep ordinary chats separate from registered project chats.
- Cancel stale async requests/subscriptions when their chat or input changes. Streaming must not cause whole-page remounts or snapshot animation on every token.
- Keep credentials server-side. Never log tokens or use private live project context as a convenient test fixture.

## Verify

Add a focused Node test for state/history/capability changes, then run typecheck and relevant tests. Inspect integration-check scripts before running them: some call configured models or write configuration/files. Prefer isolated fixtures; use a real runtime only when the task requires it and its side effects are authorized. Report whether verification used fixtures or a live runtime.
