# OMP GUI parity work

Settings cleanup, 2026-11-22: manual task-plan mutation/import/export controls were intentionally
removed from Session. Task progress remains agent-owned in the conversation. `set_todos` is now an
expert diagnostic command, not a normal settings workflow. Historical implementation checkboxes
below describe the original parity pass; the current coverage map records this deliberate change.

Requested: close the gaps in the versioned [coverage audit](CAPABILITIES.md), while preserving the
approved interface and shared web/Tauri runtime. Native OMP owns execution and policy. A manual JSON
console, silent event forwarding or a setting row with no choices does not close a feature gap.

## Installer correction

- [x] Add an invisible top-edge drag target without adding a title bar.
- [x] Verify drag routing and independent close-button routing in the inert fixture.
- [x] Build the distributable installer and generate checksums. Native physical dragging still needs acceptance.

## Runtime communication and settings

- [x] Enable native tool questions and preserve supported extension UI behavior.
- [x] Render command output, native notices and extension/runtime failures.
- [x] Preserve dialog cancellation, deadlines, defaults, descriptions, checkbox state and secret inputs.
- [x] Apply extension composer text and placement-aware widgets without losing drafts.
- [x] Negotiate protocol v2 and validate/reassemble large frames; page large history.
- [x] Fix all enum option gaps using authoritative native definitions.
- [x] Parse quoted launch arguments correctly and distinguish protocol-incompatible flags.
- [x] Distinguish global configuration, active-session behavior and terminal-only preferences.

## Session workflows

- [x] Goal lifecycle/budgets and editable todos, including import/export.
- [x] Queue withdraw/promote/edit, abort-and-restore and interrupt/resubmit.
- [x] Fork/export result handling and a real branch/tree/label/summary workflow.
- [x] Provider account selection/logout and supported authentication handoffs.
- [x] Retry/bash/cache/interrupt controls with native results and cancellation. RPC bash returns output on completion; native CLI jobs expose incremental log output.
- [x] Side questions, history and composer word-completion/feedback.

## Agent and media workflows

- [x] Subagent live lifecycle/progress, child transcript, steering and cancel.
- [x] Live voice connection/capture/mute/stop and lifecycle cleanup.
- [x] Draft-only dictation with capture identity, cancellation and insert-once semantics.
- [x] Host tool and virtual URI request/update/result/cancel adapters where host-owned features need them.

## Native management

- [x] Guided, schema-backed access to native CLI operations, with results, cancellation and real service state.
- [x] Profiles/configuration scopes, bundled agents and skill registry management.
- [x] Session pack/unpack/transfer, native dependencies/updates, provider usage limits and process management.
- [x] Git/worktrees, SSH, browser relay/collaboration and other native service workflows.
- [x] Explicit native handoffs for terminal-only or credential-bearing flows that RPC cannot implement.
      Do not expose credentials in generic command output or silently publish/share anything.
- [x] Refresh the native command/schema catalog and every mapped coverage row.

## Verification

- [x] Focused regressions and isolated real-runtime checks for communication/state changes.
- [x] Rendered inert UI checks for the new workflow surfaces, question defaults, queue recovery, completion, transport controls, native job output and preserved drafts. This is representative coverage, not exhaustive live acceptance.
- [x] Typecheck, relevant tests, production build and desktop runtime checks.
- [x] Regenerate the audit with per-workflow verification evidence and remaining upstream boundaries.

Live model/provider requests, installs, account mutations and publication are not acceptance fixtures.
Use inert/local fixtures unless a specific real action is authorized. Record verification limits rather
than substituting invented success, usage, tool output or task completion.

## Evidence and acceptance limits

The checked items above describe implemented routes and the checks listed here; they do not mean every
provider, microphone, native service or OS interaction was exercised. See [CAPABILITIES.md](CAPABILITIES.md)
for the versioned, per-command route map and the distinction between guided forms and native handoffs.

- TypeScript checks and all 78 Node tests pass. The documentation checker passes.
- The isolated native RPC fixture negotiates protocol v2, delivers a startup question, reassembles a
  large response and pages 401 synthetic messages. It sends zero model requests.
- All 54 installed top-level help routes parse. A real read-only stats job runs to completion in a
  temporary, credential-filtered profile; its output cursor and summary retention checks pass.
- The actual Vite proxy passes same-origin API requests and rejects remote/null origins in the inert
  `node scripts/check-api-origin.mjs` integration check.
- Browser fixtures cover dark/light/custom accent, a 700px pane, structured questions, focused initial
  options, secret inputs, queue recovery, plan editing, branch labels, account metadata, child transcript
  and steering, dictation insertion, ghost completion, transport controls and native job logs.
- The shared production UI, desktop executable and custom Windows installer are rebuilt. The bundled
  backend readiness/authentication/assets/window IPC/shutdown checks and artifact checksums are checked
  separately from interactive native-window behavior.

Still requiring live acceptance: microphone and audio playback; speech, realtime, prediction and side-
question providers; goal continuation and model-generated summaries; actual subagents; provider login/
logout; installation, updating and service mutations; OS terminal launching on Windows/macOS/Linux;
physical installer dragging and reduced-motion OS preferences. No real install, account change, model
request, publication or private-project write was used to make these boxes pass.
