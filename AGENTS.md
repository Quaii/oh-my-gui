# omp.

A React interface for the local OMP agent runtime. Vite serves the UI; a Node TypeScript server
bridges OMP's JSONL RPC to HTTP and SSE. Read [README.md](README.md) for setup and
[DESIGN.md](DESIGN.md) before changing the interface. The current design is intentional: this is
primarily a polish and correctness phase, not an invitation to redesign it.

## One interface, two hosts

The browser version works today. `tauri` is the desktop integration branch; a working Tauri app is
not implemented merely because the branch exists. Keep the React interface and backend behavior
shared. Add desktop lifecycle and packaging around them rather than maintaining a second UI or
rewriting the backend without a concrete need.

`web-baseline` and tag `web-baseline-2026-11-15` preserve the web version before desktop integration.
Leave those refs untouched. Work on the requested development branch. The repository stays private
until the owner explicitly chooses publication.

## Where code goes

| Location | Owns |
| --- | --- |
| [web/src/App.tsx](web/src/App.tsx) | Workspace composition, active chat, routing and file-panel visibility |
| [web/src/components](web/src/components) | Product components; `settings/` for management, `files/` for the editor |
| [web/src/components/ui](web/src/components/ui) | Shared primitives and attributed registry components |
| [web/src/components/transitions](web/src/components/transitions) | Shared transition-kit integration |
| [web/src/lib](web/src/lib) | UI state, appearance, transcript transforms, file drafts and pure helpers |
| [web/src/index.css](web/src/index.css) | Semantic tokens and product styling; later overrides matter |
| [server/src](server/src) | Local API, OMP process/RPC, persistence, filesystem access and integrations |
| [shared](shared) | Shared configuration and workspace identity helpers |
| [server/tests](server/tests) | Node test suite, including imported pure frontend helpers |
| [scripts](scripts) | Explicit integration checks and maintenance tools |

Rules:

- React does not access the host filesystem or credentials directly. Keep those operations behind the
  local API. Shared/pure helpers must not acquire UI or process side effects just to serve one caller.
- OMP remains the agent runtime. Use actual RPC capabilities, events and saved history; do not invent
  tool results, progress, token totals, task completion, or permissions to make the UI look finished.
- Resolve project membership with the shared workspace helpers. A working directory or Git ancestor
  alone is not proof that a chat belongs to a registered project.
- Appearance goes through the theme/appearance modules, including validation, defaults, import/export,
  live updates and favicon synchronization. Workspace icons and editor file icons are separate settings.
- Reuse existing primitives and semantic icon registries. Keep registry attribution and licenses when
  adapting third-party components; record new assets in [ASSET-CREDITS.md](ASSET-CREDITS.md).

## Working on it

```sh
npm install
npm run dev          # API 4317, Vite 5317
npm run typecheck
npm test
npm run build
npm run docs:check
```

`npm start` serves the built UI and API on 4317. Set `OMP_API_TARGET` when Vite needs a separate API;
`PORT`, `HOST` and `OMP_BIN` configure the local server/runtime. Use a Node version that supports the
direct TypeScript execution used by the scripts. Match [package-lock.json](package-lock.json).

- Use TypeScript, ESM and function components. Keep new code readable, normally with two-space
  indentation; match nearby quote/import conventions. Existing compact files are not a reason to
  compress new logic or reformat unrelated code. New helpers need a concrete caller, not a framework.
- Read the component, its state helper, and the final applicable CSS rules before editing. Search for
  existing behavior before adding another hook, store, endpoint, animation or package.
- Keep drafts, selection and undo through tab, chat, Home and Settings changes. Visibility changes
  must not accidentally remount editors. Keep layout classes when replacing a component wrapper.
- File saves retain real-path scope checks, encoding/size constraints and version conflict detection.
  Configuration writes preserve unrelated keys and existing backup behavior. Never silently discard
  drafts or overwrite an externally changed file.
- Keep API binding on loopback. Do not commit credentials, private transcripts, local configuration,
  screenshots of personal data, build output or `.tmp/` artifacts. Integration credentials stay on the
  server and are sent only to their intended service.
- Permissions display the authoritative native policy. Loading a screen does not change permissions.
  Fast mode is visible only when both the model and its provider route support it.

## Check the behavior, not just the build

For executable changes, run typecheck and the relevant tests; build before shipping UI changes.
Add focused regression tests for state transforms, persistence, routing and filesystem behavior.
A small copy/style adjustment does not need a test that merely repeats its implementation.

For visual changes, inspect the rendered app: dark and light themes, relevant custom accent, narrow
panes, loading/error/empty states, keyboard focus and reduced motion. Exercise opening **and** closing,
rapid repeated interaction, and navigation back. Confirm that the main panel has real dimensions and
that editor drafts survive. A successful HTTP response from a Vite route is not a rendered-page test.
State exactly which checks ran and what remains unverified.

The integration scripts in [README.md](README.md) can issue model requests or write test files.
Inspect their destination and side effects before running them; keep test writes isolated and use
the configured test API. Do not send private project context merely to check visual spacing.

## Agent skills

[.agents/skills/README.md](.agents/skills/README.md) is the skill index. Load the skill relevant to the
task, not the entire library. `CLAUDE.md` imports this guide; `.claude/skills/` exposes the same workflows
through thin entries pointing to the canonical skills. Change instructions in one place.

| Task | Skill |
| --- | --- |
| Spacing, materials, icons, responsive polish | [omp-ui-polish](.agents/skills/omp-ui-polish/SKILL.md) |
| Transitions, disclosure distortion, blur/scroll motion | [omp-motion-review](.agents/skills/omp-motion-review/SKILL.md) |
| Chat streaming, runtime state, tools and permissions | [omp-runtime](.agents/skills/omp-runtime/SKILL.md) |
| File browser, drafts, Markdown and guarded saves | [omp-editor](.agents/skills/omp-editor/SKILL.md) |

## Changes and attribution

Keep the user's Git identity. Do not add assistant/bot coauthors or tool-name prefixes to branch names.
Use concise commit subjects describing the actual change. Check the staged diff for secrets and
unrelated files. Commit/push only within the user's authorized workflow; never make the repository
public, rewrite history or modify the preserved baseline as a side effect of another task.

When a requested design change is deliberate, update `DESIGN.md` alongside it. When code drifts from
the approved design, fix the regression rather than documenting the accidental appearance as the new
standard. Root guidance holds the invariants; skills hold task workflows; the design guide holds values.
