---
name: omp-motion-review
description: Review or fix transition, disclosure, scroll-fade and resize animation defects in omp. Use when motion distorts text, breaks layout, or conflicts with input.
---

# Review workspace motion

Read the motion and scroll sections of [DESIGN.md](../../../DESIGN.md). The implementation lives in web/src/components/transitions, web/src/lib/motion.ts, ToolbarBlur.tsx and final index.css rules.

## Check the boundary first

Identify the user action, the state update and the snapshot owner. Preserve existing route/panel layout classes when wrapping elements. Do not add a second transition system to the same action. Reproduce both directions, rapid repeats and an interrupted interaction.

## Standards

- Use transition-kit where it fits the shared interaction. Preserve existing specialized streaming/status components.
- Morphing disclosure snapshots keep tk-text and tk-clip so content retains its natural size; text must not stretch as the container shrinks.
- Typing, token deltas and live drag resizing stay immediate. Do not schedule these inside a page/layout transition.
- Header/composer fades use the established continuous masks. Do not rebuild stepped blur layers from obsolete CSS selectors or spread fades across ordinary scroll surfaces.
- Preserve reduced-motion behavior and an immediate fallback when transition APIs are absent. Verify keyboard interaction; a hover-only fix is incomplete.
- Use actual local timings from DESIGN.md/the owning component. Do not impose a new universal spring or duration across the app.

## Review output

For each defect, give the trigger, observed failure, owning component and smallest correction. Distinguish observed behavior from a suspected cause. After a fix, verify opening, closing, navigation back, panel dimensions and retained editor state. Report any interaction not exercised. Never call a distorted intermediate frame acceptable merely because the final frame is correct.
