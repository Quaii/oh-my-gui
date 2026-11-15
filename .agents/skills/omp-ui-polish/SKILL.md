---
name: omp-ui-polish
description: Fix spacing, surfaces, icons and responsive UI in the existing omp. design. Use for visual bugs and focused polish, not a fresh redesign.
---

# Polish the existing workspace

Read [AGENTS.md](../../../AGENTS.md) and [DESIGN.md](../../../DESIGN.md). Keep the current composition. A spacing fix should not become a new material system.

## Find the owner

Trace the component, its data/state owner, and the last applicable rules in web/src/index.css. Identify whether the surface is canvas, an ordinary card, or a floating surface. Reuse the matching primitive/class before adding CSS. Preview the actual selected icon set, not just a Lucide fallback.

## Make the correction

- Measure padding from the panel or card, not the browser edge. Match both axes. Preserve the main route's flex/min-height/min-width sizing.
- Ordinary cards use the sidebar surface by default. Floating breadcrumbs, context cards and the editor card intentionally differ. Card glass and menu glass are independent preferences.
- Keep blur behind floating controls. ScrollFrame does not imply a blur mask. Do not add fades to plain gallery/list edges.
- Respect right-aligned settings controls, reset-before-control ordering, and hover/focus/touch availability. Long labels must not change a tile's alignment.
- Use the existing horizontal carousel for overflowing suggestions or contributors. Test dragging without triggering its links/buttons.

## Verify and report

Check the affected state in dark/light themes, a custom accent and a narrow panel. Include the neighboring controls in the comparison. Exercise hover, focus, selection and disabled states. A browser screenshot can establish appearance; a build alone cannot. Report the cause, change and observed verification. Update DESIGN.md only when the requested visual rule changes intentionally.
