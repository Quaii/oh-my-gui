# OMP GUI coverage audit

Checked 2026-11-16T15:58:37.437Z against **omp/18.20.0**, the installed runtime, with GUI source inspected at 78682bc. **The GUI does not yet expose every OMP feature as a complete workflow.** This is an audit and prioritized implementation map, not a claim that missing features were added.

## Scope and evidence

The inventory contains **74 canonical RPC commands**, **54 top-level CLI commands**, **615 configuration fields**, **49 built-in slash commands (123 advertised subcommands)**, **60 main launch flags**, and **30 help-listed built-in tools**. Counts describe different surfaces and must not be added into a feature-completion percentage.

Sources: the installed binary's --version/--help/config list and ready/read RPCs; matching [v18.20.0 RpcCommand definitions](https://github.com/can1357/oh-my-pi/blob/v18.20.0/packages/coding-agent/src/modes/rpc/rpc-types.ts), [RPC behavior](https://github.com/can1357/oh-my-pi/blob/v18.20.0/docs/rpc.md), [RPC implementation](https://github.com/can1357/oh-my-pi/blob/v18.20.0/packages/coding-agent/src/modes/rpc/rpc-mode.ts), and [slash dispatch](https://github.com/can1357/oh-my-pi/blob/v18.20.0/packages/coding-agent/src/slash-commands/available-commands.ts). Local code references below are the GUI evidence.

The live read probes used an isolated temporary agent directory, an inert keyless model definition, no extensions/skills/tools/LSP/context files, no saved sessions, and a credential-filtered environment. No prompt, provider login/logout, model request, tool execution, real configuration write, package installation, sharing action or user transcript inspection was performed. Temporary fixture files were removed. The default settings schema was inspected; private effective project/global values were not collected.

**Reachability is separate from verification.** Direct/integrated means a source-traced GUI route exists, not that every mutation passed native acceptance. Thirteen read-only RPC probes passed. In-memory reducer fixtures confirmed five client event defects. No browser/native interaction or mutating OMP acceptance was performed for this audit. Arbitrary installed third-party extension behavior and every CLI subcommand/option remain outside exhaustive verification.

## Coverage definitions

| Classification | Meaning |
| --- | --- |
| Direct control | A visible purpose-built control routes the action to OMP. |
| Integrated route | Normal GUI behavior uses the RPC, or an equivalent native route, without asking the user for JSON. |
| Partial | Some UI exists, but arguments, result consumption, state synchronization or supported variants are incomplete. |
| JSON console only | An expert can compose native JSON in Runtime capabilities; there is no ordinary feature control. |
| Missing workflow | No usable feature integration. A raw forwarding endpoint is not sufficient for audio or request/result protocols. |
| Terminal-specific | A terminal-only view/developer workflow is not automatically a requirement to reproduce in the GUI. |

## RPC reachability totals

| Classification | Commands |
| --- | --- |
| Direct control | 12 |
| Integrated route | 11 |
| Partial | 10 |
| JSON console only | 31 |
| Missing workflow | 10 |

The cached GUI catalog currently lists 68/74 canonical commands. Missing from it: `live_start`, `live_connect`, `live_stop`, `live_mute`, `dictation_start`, `dictation_stop`. The generic API can forward arbitrary JSON, but does not supply the missing audio/UI/event handling.

## Implementation order

P0 restores basic user/runtime communication. P1 finishes existing workflows. P2 covers additional native capabilities or an explicit product decision. These priorities are recommendations from the audit; no implementation work is implied.

| Priority | Feature | Coverage | Finding / next work | Local evidence |
| --- | --- | --- | --- | --- |
| P0 | Tool questions | Missing | OmpBridge hardcodes --mode rpc; upstream rpc-ui enables tool UI. A React select dialog alone does not make the native ask tool usable. rpc-ui also disables PTY, so shell behavior needs acceptance when changing modes. | [server/src/omp.ts:71](server/src/omp.ts#L71) |
| P0 | Slash output and native notices | Missing | command_output and notice frames are discarded by chatReducer. Commands can run with no visible answer or error. | [web/src/lib/store.ts:142](web/src/lib/store.ts#L142) |
| P0 | Dialog cancellation and selection fidelity | Partial | cancel does not remove targetId; initialIndex/checkedIndices/checkbox markers/option descriptions are dropped; input secret hints are not propagated. | [web/src/lib/store.ts:269](web/src/lib/store.ts#L269) |
| P1 | Extension composer updates | Missing | set_editor_text displays a notice but does not put the supplied text into the composer. | [web/src/lib/store.ts:263](web/src/lib/store.ts#L263) |
| P1 | Lossless large RPC frames | Missing | No negotiate_protocol/v2 decoder, and snapshot.ts uses unpaged get_messages. Large history/tool/extension payloads retain protocol-v1 limits. | [server/src/omp.ts:101](server/src/omp.ts#L101) |
| P1 | Goal lifecycle and task editing | Partial | Display-only task plan is good; start/pause/resume/clear/budget and editable todos still need controls. | [web/src/components/GoalPlan.tsx:7](web/src/components/GoalPlan.tsx#L7) |
| P1 | Queue management | Partial | Steer/follow-up and queued chips exist, but withdraw/promote/edit/restore operations require manual JSON. | [web/src/components/Composer.tsx:243](web/src/components/Composer.tsx#L243) |
| P1 | Subagent conversations and steering | Partial | Agent list/cancel exists; child transcripts, steering and lifecycle/progress subscriptions need dedicated integration. | [web/src/components/RightRail.tsx:30](web/src/components/RightRail.tsx#L30) |
| P1 | Export/fork/tree completion | Partial | Export path and fork result are ignored; tree navigation is limited to checkpoints/reply versions. | [web/src/pages/SettingsPage.tsx:457](web/src/pages/SettingsPage.tsx#L457) |
| P1 | Provider accounts and MCP authentication | Partial | Provider logout/account selection are console-only. MCP config/probe exists, but upstream RPC does not install interactive MCP authentication handling. | [web/src/components/settings/McpPanel.tsx:54](web/src/components/settings/McpPanel.tsx#L54) |
| P1 | Settings reachability versus effect | Partial | 615 global fields are listed; 23 enum controls have no choices, 165 fields lack UI metadata, and 167 have no tab category. TUI-only fields and RPC defaults also limit the effect of configuration. | [web/src/components/settings/ConfigList.tsx:28](web/src/components/settings/ConfigList.tsx#L28) |
| P1 | Launch flags | Partial | Launch flags are split on whitespace, so quoted paths/arguments are not preserved. Interactive/print/output-mode flags cannot be counted as working RPC features merely because the text box accepts them. | [web/src/pages/SettingsPage.tsx:266](web/src/pages/SettingsPage.tsx#L266) |
| P2 | Voice and dictation | Missing | No microphone/WebRTC/session/capture/mute UI or voice/dictation event consumers. Speech-related settings/model roles do not provide that workflow. | [web/src/components/Composer.tsx:187](web/src/components/Composer.tsx#L187) |
| P2 | Word completion and side questions | Missing | No predict_word ghost text/feedback or btw streaming/history view. Project suggestions are a different host feature. | [web/src/components/Composer.tsx:147](web/src/components/Composer.tsx#L147) |
| P2 | Host-owned tools and virtual URIs | Missing | No request dispatch, cancellation, update/result or URI read/write responder. Raw JSON registration alone can leave requests unanswered. | [server/src/omp.ts:143](server/src/omp.ts#L143) |
| P2 | Native CLI services and administration | Missing | No profile manager, session transfer, skill registry installation/publishing, native updater/dependency installer, provider quota view, auth broker, process console or full Git UI. | [web/src/components/settings/SettingsNavigation.tsx:13](web/src/components/settings/SettingsNavigation.tsx#L13) |
| P2 | Extension terminal components | Upstream boundary | Native component factories/custom header/footer/editor/raw input/autocomplete/theme APIs are terminal-only. They require an adapter or an explicitly retained terminal workflow. | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |

## Every canonical RPC command

| RPC | Coverage | GUI route / limitation | Read probe | Local evidence |
| --- | --- | --- | --- | --- |
| `negotiate_protocol` | Missing workflow | No host protocol negotiation. Bridge stays on v1 and has no rpc_chunk reassembly; large responses/events retain v1 limitations. Do not enable v2 until the decoder exists. | not executed | [server/src/omp.ts:101](server/src/omp.ts#L101) |
| `prompt` | Direct control | Composer → Send. Text and image prompts; arbitrary document/audio attachments are absent. | not executed | [web/src/App.tsx:241](web/src/App.tsx#L241) |
| `steer` | Integrated route | Composer → steer / follow-up. Equivalent prompt.streamingBehavior route; queue editing is separate and absent. | not executed | [web/src/App.tsx:243](web/src/App.tsx#L243) |
| `follow_up` | Integrated route | Composer → steer / follow-up. Equivalent prompt.streamingBehavior route; queue editing is separate and absent. | not executed | [web/src/App.tsx:243](web/src/App.tsx#L243) |
| `remove_queued_message` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `promote_queued_message` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `abort` | Direct control | Composer → Stop / Escape. Native abort is sent; queue restoration/interrupt-and-resubmit are not exposed. | not executed | [web/src/App.tsx:263](web/src/App.tsx#L263) |
| `abort_and_prompt` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `abort_and_restore_queue` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `new_session` | Partial | Sidebar New chat; Settings → Session. New chat works through bridge creation. The separate Session action sends new_session without reattaching/reloading the transcript. | not executed | [web/src/pages/SettingsPage.tsx:455](web/src/pages/SettingsPage.tsx#L455) |
| `open_session` | JSON console only | Settings → Runtime capabilities → JSON console. No dedicated session-directory open control for this RPC; saved file selection uses switch_session instead. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `get_state` | Integrated route | Chat initialization / refresh / selectors / statistics. Read RPCs are wired into normal GUI state. | passed | [web/src/App.tsx:167](web/src/App.tsx#L167) |
| `set_fast_mode` | Direct control | Composer model / thinking / supported Fast control. Fast is capability-gated. Model routes remain native. | not executed | [web/src/App.tsx:671](web/src/App.tsx#L671) |
| `set_slow_mode` | Direct control | Settings → Session. Dedicated per-session controls. | not executed | [web/src/pages/SettingsPage.tsx:389](web/src/pages/SettingsPage.tsx#L389) |
| `goal` | Partial | Task plan card + JSON console. Plan/goal state is displayed. No direct goal lifecycle/budget control or todo editing/reordering/import/export interface. | not executed | [web/src/components/GoalPlan.tsx:7](web/src/components/GoalPlan.tsx#L7) |
| `set_ask_dialog` | Missing workflow | No multi-question ask adapter. Tool UI is not enabled by the plain rpc bridge. The optional structured ask dialog is not negotiated or rendered. | not executed | [server/src/omp.ts:71](server/src/omp.ts#L71) |
| `get_available_commands` | Integrated route | Chat initialization / refresh / selectors / statistics. Read RPCs are wired into normal GUI state. | passed | [web/src/App.tsx:167](web/src/App.tsx#L167) |
| `get_entries` | Integrated route | Saved chats / transcript / inline edit / reply branches. Native entries and saved-file switching are integrated. The current snapshot loader uses get_messages, not paged reads; large transport responses remain a gap. | passed | [server/src/snapshot.ts:4](server/src/snapshot.ts#L4), [web/src/App.tsx:397](web/src/App.tsx#L397) |
| `get_tree` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | passed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `set_todos` | Partial | Task plan card + JSON console. Plan/goal state is displayed. No direct goal lifecycle/budget control or todo editing/reordering/import/export interface. | not executed | [web/src/components/GoalPlan.tsx:7](web/src/components/GoalPlan.tsx#L7) |
| `set_host_tools` | Missing workflow | No host request/result adapter. Registration alone in JSON is insufficient: host_tool_call/cancel and host_uri_request/cancel are not serviced. | not executed | [server/src/omp.ts:143](server/src/omp.ts#L143) |
| `set_host_uri_schemes` | Missing workflow | No host request/result adapter. Registration alone in JSON is insufficient: host_tool_call/cancel and host_uri_request/cancel are not serviced. | not executed | [server/src/omp.ts:143](server/src/omp.ts#L143) |
| `set_subagent_subscription` | Partial | JSON console only; Agents card shows snapshots. Subscription changes can be submitted but subagent_lifecycle/progress/event frames have no matching client presentation. | not executed | [web/src/lib/store.ts:289](web/src/lib/store.ts#L289) |
| `set_event_filter` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `get_subagents` | Partial | Workspace cards → Agents. Basic list/cancel is present. Refresh is snapshot-based; structured lifecycle/progress subscriptions are not integrated. | passed | [web/src/App.tsx:200](web/src/App.tsx#L200) |
| `get_subagent_messages` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `cancel_subagent` | Direct control | Workspace cards → Agents → Cancel agent. Visible for active agents; live child conversation/steering UI is absent. | not executed | [web/src/components/RightRail.tsx:30](web/src/components/RightRail.tsx#L30) |
| `steer_subagent` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `live_start` | Missing workflow | No voice/dictation controls or events. All six are absent from the cached catalog. Microphone/WebRTC/capture lifecycle, transcript insertion and mute/playback are not implemented. | not executed | [web/src/components/Composer.tsx:187](web/src/components/Composer.tsx#L187) |
| `live_connect` | Missing workflow | No voice/dictation controls or events. All six are absent from the cached catalog. Microphone/WebRTC/capture lifecycle, transcript insertion and mute/playback are not implemented. | not executed | [web/src/components/Composer.tsx:187](web/src/components/Composer.tsx#L187) |
| `live_stop` | Missing workflow | No voice/dictation controls or events. All six are absent from the cached catalog. Microphone/WebRTC/capture lifecycle, transcript insertion and mute/playback are not implemented. | not executed | [web/src/components/Composer.tsx:187](web/src/components/Composer.tsx#L187) |
| `live_mute` | Missing workflow | No voice/dictation controls or events. All six are absent from the cached catalog. Microphone/WebRTC/capture lifecycle, transcript insertion and mute/playback are not implemented. | not executed | [web/src/components/Composer.tsx:187](web/src/components/Composer.tsx#L187) |
| `dictation_start` | Missing workflow | No voice/dictation controls or events. All six are absent from the cached catalog. Microphone/WebRTC/capture lifecycle, transcript insertion and mute/playback are not implemented. | not executed | [web/src/components/Composer.tsx:187](web/src/components/Composer.tsx#L187) |
| `dictation_stop` | Missing workflow | No voice/dictation controls or events. All six are absent from the cached catalog. Microphone/WebRTC/capture lifecycle, transcript insertion and mute/playback are not implemented. | not executed | [web/src/components/Composer.tsx:187](web/src/components/Composer.tsx#L187) |
| `set_model` | Direct control | Composer model / thinking / supported Fast control. Fast is capability-gated. Model routes remain native. | not executed | [web/src/App.tsx:671](web/src/App.tsx#L671) |
| `cycle_model` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `get_available_models` | Integrated route | Chat initialization / refresh / selectors / statistics. Read RPCs are wired into normal GUI state. | passed | [web/src/App.tsx:167](web/src/App.tsx#L167) |
| `set_thinking_level` | Direct control | Composer model / thinking / supported Fast control. Fast is capability-gated. Model routes remain native. | not executed | [web/src/App.tsx:671](web/src/App.tsx#L671) |
| `cycle_thinking_level` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `get_available_thinking_levels` | Integrated route | Chat initialization / refresh / selectors / statistics. Read RPCs are wired into normal GUI state. | passed | [web/src/App.tsx:167](web/src/App.tsx#L167) |
| `set_steering_mode` | Direct control | Settings → Session. Dedicated per-session controls. | not executed | [web/src/pages/SettingsPage.tsx:389](web/src/pages/SettingsPage.tsx#L389) |
| `set_follow_up_mode` | Direct control | Settings → Session. Dedicated per-session controls. | not executed | [web/src/pages/SettingsPage.tsx:389](web/src/pages/SettingsPage.tsx#L389) |
| `set_interrupt_mode` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `compact` | Partial | Settings → Session → compact now. Basic compaction is wired; customInstructions requires JSON. No model call was made in this audit. | not executed | [web/src/pages/SettingsPage.tsx:454](web/src/pages/SettingsPage.tsx#L454) |
| `set_auto_compaction` | Direct control | Settings → Session. Dedicated per-session controls. | not executed | [web/src/pages/SettingsPage.tsx:389](web/src/pages/SettingsPage.tsx#L389) |
| `set_cache_warming` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `set_auto_retry` | Direct control | Settings → Session. Dedicated per-session controls. | not executed | [web/src/pages/SettingsPage.tsx:389](web/src/pages/SettingsPage.tsx#L389) |
| `abort_retry` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `bash` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `abort_bash` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `get_session_stats` | Integrated route | Chat initialization / refresh / selectors / statistics. Read RPCs are wired into normal GUI state. | passed | [web/src/App.tsx:167](web/src/App.tsx#L167) |
| `get_session_lease` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `export_html` | Partial | Settings → Session. Buttons exist, but the response is not used to open the forked session or expose/download the exported file. | not executed | [web/src/pages/SettingsPage.tsx:457](web/src/pages/SettingsPage.tsx#L457) |
| `switch_session` | Integrated route | Saved chats / transcript / inline edit / reply branches. Native entries and saved-file switching are integrated. The current snapshot loader uses get_messages, not paged reads; large transport responses remain a gap. | not executed | [server/src/snapshot.ts:4](server/src/snapshot.ts#L4), [web/src/App.tsx:397](web/src/App.tsx#L397) |
| `branch` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `fork` | Partial | Settings → Session. Buttons exist, but the response is not used to open the forked session or expose/download the exported file. | not executed | [web/src/pages/SettingsPage.tsx:457](web/src/pages/SettingsPage.tsx#L457) |
| `navigate_tree` | Partial | Checkpoint restore / inline edit / reply version continuation. No arbitrary tree picker, branch labels, custom summary instruction or summary abort UI. | not executed | [web/src/App.tsx:399](web/src/App.tsx#L399) |
| `abort_branch_summary` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `set_label` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `get_branch_messages` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | passed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `get_last_assistant_text` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | passed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `set_session_name` | Direct control | Chat rename / Settings → Session. Dedicated native rename control. | not executed | [web/src/App.tsx:370](web/src/App.tsx#L370) |
| `handoff` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `get_messages` | Integrated route | Saved chats / transcript / inline edit / reply branches. Native entries and saved-file switching are integrated. The current snapshot loader uses get_messages, not paged reads; large transport responses remain a gap. | passed | [server/src/snapshot.ts:4](server/src/snapshot.ts#L4), [web/src/App.tsx:397](web/src/App.tsx#L397) |
| `get_messages_page` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | passed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `get_login_providers` | Integrated route | Settings → Providers / Installation. Provider names and signed-in state are queried; credentials stay on the server. | not executed | [web/src/pages/SettingsPage.tsx:114](web/src/pages/SettingsPage.tsx#L114) |
| `login` | Partial | Settings → Providers → login. OAuth URL/non-secret prompts are partly supported; native RPC rejects secret/pre-URL prompts. Automatic window.open can be blocked. | not executed | [web/src/pages/SettingsPage.tsx:553](web/src/pages/SettingsPage.tsx#L553) |
| `get_logout_accounts` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `logout` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `predict_word` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `predict_word_feedback` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `btw` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `btw_cancel` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |
| `get_btw_history` | JSON console only | Settings → Runtime capabilities → JSON console. Raw RPC entry only; no dedicated GUI workflow. Event-driven results (notably btw, bash and subagent work) lack a matching live view. JSON query results can be inspected. | passed | [web/src/components/settings/CapabilitiesPanel.tsx:12](web/src/components/settings/CapabilitiesPanel.tsx#L12) |

## Configuration fields

All **615** fields enter Settings → All settings and search, but **23 enum fields have no selectable options** in the current form renderer. 450 have UI metadata, 165 do not, and 167 have no native tab assignment. Those advanced/unassigned fields are still listed. Complex arrays/records/objects use a JSON popover. The raw config.yml editor is an expert fallback, not proof that every form control works. See [web/src/components/settings/Controls.tsx:63](web/src/components/settings/Controls.tsx#L63).

| Settings category | Fields |
| --- | --- |
| Unassigned / advanced | 167 |
| model | 66 |
| interaction | 56 |
| appearance | 50 |
| providers | 39 |
| context | 31 |
| memory | 31 |
| files | 28 |
| tools | 83 |
| shell | 18 |
| tasks | 46 |

**Enum form gaps:** `treeFilterMode`, `tier.openai`, `tier.anthropic`, `tier.google`, `tier.subagent`, `tier.advisor`, `providers.anthropic.slowMode`, `providers.tinyModelDevice`, `providers.tinyModelDtype`, `live.voice`, `tts.localVoice`, `speech.voice`, `codexResets.autoRedeem5h`, `codexResets.autoRedeemWeekly`, `claudeResets.autoRedeem5h`, `claudeResets.autoRedeemWeekly`, `claudeResets.autoRedeemFable`, `advisor.syncBacklog`, `hindsight.recallBudget`, `dev.autoqaConsent`, `task.maxEffort`, `stt.submitTrigger`, `spotlight.thinking`.

Setting writes use `omp config set/reset` without a project/profile scope selector. Some keys control only OMP's terminal UI; the web appearance system is separate. RPC protocol defaults also differ from interactive defaults unless explicitly configured. A visible setting therefore does not establish that it affects the active RPC session or this GUI. The machine-readable map lists every setting key/type/category without user values.

## Every top-level CLI command

Launch flags are appended to `omp --mode rpc`; they are not a terminal for invoking arbitrary top-level CLI commands. Agent-mediated shell/tool access is also not a substitute for a corresponding user-facing management workflow. Some developer/service commands may intentionally remain CLI-only after a product decision.

| CLI command | Coverage | GUI equivalent / gap | Local evidence |
| --- | --- | --- | --- |
| `omp acp` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp agents` | Partial | Tasks settings / All settings. Task agent overrides can be configured; no dedicated bundled-agent inventory/editor. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp anonymize` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp auth` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp auth-broker` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp auth-gateway` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp bash` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp bench` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp browser-relay` | Partial | Related slash commands can be entered. Not a full CLI management workflow. Slash text output is dropped; CLI-only options/services are not handled. | [web/src/components/settings/CommandsPanel.tsx:46](web/src/components/settings/CommandsPanel.tsx#L46) |
| `omp cleanse` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp clip` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp collab` | Partial | Related slash commands can be entered. Not a full CLI management workflow. Slash text output is dropped; CLI-only options/services are not handled. | [web/src/components/settings/CommandsPanel.tsx:46](web/src/components/settings/CommandsPanel.tsx#L46) |
| `omp commit` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp completions` | Terminal-specific | Terminal workflow. Native terminal previews/replay/shell completions are intentionally outside the graphical host. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp compress` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp config` | Partial | All settings / config.yml. All 615 global keys are listed, but 23 enum rows lack choices in normal controls. Raw config.yml is a fallback; project/profile scope has no dedicated manager. | [server/src/settings.ts:124](server/src/settings.ts#L124) |
| `omp dry-balance` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp find` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp gallery` | Terminal-specific | Terminal workflow. Native terminal previews/replay/shell completions are intentionally outside the graphical host. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp gc` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp git` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp grep` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp grievances` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp if-bench` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp images` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp install` | Partial | Settings → Extensions. Install/remove/enable/disable/upgrade, marketplace and diagnostics subset. Not every native plugin CLI option. | [server/src/workspace-features.ts:14](server/src/workspace-features.ts#L14) |
| `omp join` | Partial | Related slash commands can be entered. Not a full CLI management workflow. Slash text output is dropped; CLI-only options/services are not handled. | [web/src/components/settings/CommandsPanel.tsx:46](web/src/components/settings/CommandsPanel.tsx#L46) |
| `omp login` | Partial | Settings → Providers. Only RPC-compatible provider login flows. | [web/src/pages/SettingsPage.tsx:553](web/src/pages/SettingsPage.tsx#L553) |
| `omp models` | Partial | Composer / Models / Providers. Catalog, roles and custom providers exist; native refresh and account/model diagnostics are not equivalent. | [web/src/components/settings/ModelsPanel.tsx:20](web/src/components/settings/ModelsPanel.tsx#L20) |
| `omp play` | Terminal-specific | Terminal workflow. Native terminal previews/replay/shell completions are intentionally outside the graphical host. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp plugin` | Partial | Settings → Extensions. Install/remove/enable/disable/upgrade, marketplace and diagnostics subset. Not every native plugin CLI option. | [server/src/workspace-features.ts:14](server/src/workspace-features.ts#L14) |
| `omp predict` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp ps` | Partial | Related slash commands can be entered. Not a full CLI management workflow. Slash text output is dropped; CLI-only options/services are not handled. | [web/src/components/settings/CommandsPanel.tsx:46](web/src/components/settings/CommandsPanel.tsx#L46) |
| `omp read` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp render` | Terminal-specific | Terminal workflow. Native terminal previews/replay/shell completions are intentionally outside the graphical host. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp say` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp search` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp session` | Partial | Saved chats / Session settings. Normal chat navigation exists; pack/unpack/moved/lease transfer workflows do not. | [web/src/pages/SettingsPage.tsx:342](web/src/pages/SettingsPage.tsx#L342) |
| `omp setup` | Partial | Desktop first-launch setup. Installs/connects OMP and opens providers. Does not expose all native optional dependency/onboarding setup actions. | [web/src/components/DesktopSetup.tsx:81](web/src/components/DesktopSetup.tsx#L81) |
| `omp sh` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp share` | Partial | Related slash commands can be entered. Not a full CLI management workflow. Slash text output is dropped; CLI-only options/services are not handled. | [web/src/components/settings/CommandsPanel.tsx:46](web/src/components/settings/CommandsPanel.tsx#L46) |
| `omp shell` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp skill` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp ssh` | Partial | Related slash commands can be entered. Not a full CLI management workflow. Slash text output is dropped; CLI-only options/services are not handled. | [web/src/components/settings/CommandsPanel.tsx:46](web/src/components/settings/CommandsPanel.tsx#L46) |
| `omp stats` | Direct control | Settings → Usage. Native usage statistics plus read-only host supplements. | [web/src/components/settings/UsagePanel.tsx:26](web/src/components/settings/UsagePanel.tsx#L26) |
| `omp stream` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp tiny-models` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp token` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp toks` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp ttsr` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp update` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp usage` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |
| `omp worktree` | Partial | Related slash commands can be entered. Not a full CLI management workflow. Slash text output is dropped; CLI-only options/services are not handled. | [web/src/components/settings/CommandsPanel.tsx:46](web/src/components/settings/CommandsPanel.tsx#L46) |
| `omp zsh` | Missing workflow | No dedicated native CLI workflow. An agent may use related tools, and some related config keys exist. That is not equivalent to exposing this CLI command in the GUI. | [web/src/pages/SettingsPage.tsx:297](web/src/pages/SettingsPage.tsx#L297) |

## Slash commands

The isolated runtime advertises 49 built-ins. The GUI can list them in Settings → Commands, reveal them in the composer/palette and submit them through prompt. Their command_output side channel is not rendered, so **listed/routable does not mean end-to-end usable**. Entry without required arguments often only requests help, whose answer is then invisible. Commands may still mutate state or invoke a model; none was executed here. TUI-only entries with no text-mode handler are not advertised by upstream. Third-party, file, skill and MCP prompt commands are dynamic and were disabled during the isolated inventory.

| Slash command | Advertised subcommands | Entry coverage |
| --- | --- | --- |
| `/security` | `plan`, `scan`, `status`, `cancel`, `scans`, `show`, `import`, `export`, `validate`, `compare`, `disposition` | Text route; output/integration partial |
| `/model` | — | Text route; output/integration partial |
| `/switch` | — | Text route; output/integration partial |
| `/fast` | `on`, `ultra`, `off`, `status` | Text route; output/integration partial |
| `/slow` | `on`, `off`, `status` | Text route; output/integration partial |
| `/skillful` | `on`, `off`, `status` | Text route; output/integration partial |
| `/extended-context` | `on`, `off`, `status` | Text route; output/integration partial |
| `/computer` | `on`, `off`, `status` | Text route; output/integration partial |
| `/ratchet` | — | Text route; output/integration partial |
| `/prewalk` | `restart`, `off` | Text route; output/integration partial |
| `/modelpreset` | `list`, `save`, `switch`, `delete` | Text route; output/integration partial |
| `/effort` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, `auto` | Text route; output/integration partial |
| `/advisor` | `on`, `off`, `status`, `dump`, `configure` | Text route; output/integration partial |
| `/export` | — | Text route; output/integration partial |
| `/trace` | — | Text route; output/integration partial |
| `/dump` | `all`, `anon` | Text route; output/integration partial |
| `/share` | — | Text route; output/integration partial |
| `/browser` | `headless`, `visible` | Text route; output/integration partial |
| `/todo` | `edit`, `copy`, `expand`, `collapse`, `export`, `import`, `append`, `start`, `done`, `drop`, `rm` | Text route; output/integration partial |
| `/session` | `info`, `delete`, `pin` | Text route; output/integration partial |
| `/jobs` | `full`, `kill` | Text route; output/integration partial |
| `/usage` | `show`, `reset` | Text route; output/integration partial |
| `/stats` | — | Text route; output/integration partial |
| `/changelog` | `full`, `last` | Text route; output/integration partial |
| `/tools` | — | Text route; output/integration partial |
| `/context` | — | Text route; output/integration partial |
| `/mcp` | `add`, `list`, `remove`, `test`, `reauth`, `unauth`, `enable`, `disable`, `reconnect`, `reload`, `resources`, `prompts`, `notifications`, `help` | Text route; output/integration partial |
| `/ssh` | `add`, `list`, `remove`, `help` | Text route; output/integration partial |
| `/fresh` | — | Text route; output/integration partial |
| `/compact` | `soft`, `remote`, `snapcompact` | Text route; output/integration partial |
| `/shake` | `elide`, `images`, `thinking` | Text route; output/integration partial |
| `/handoff` | — | Text route; output/integration partial |
| `/pin` | — | Text route; output/integration partial |
| `/unpin` | — | Text route; output/integration partial |
| `/retry` | — | Text route; output/integration partial |
| `/memory` | `view`, `stats`, `diagnose`, `queue`, `sync`, `clear`, `reset`, `enqueue`, `rebuild`, `mm list`, `mm show`, `mm refresh`, `mm history`, `mm seed`, `mm delete`, `mm reload` | Text route; output/integration partial |
| `/rename` | — | Text route; output/integration partial |
| `/move` | — | Text route; output/integration partial |
| `/wt` | — | Text route; output/integration partial |
| `/add-dir` | — | Text route; output/integration partial |
| `/remove-dir` | — | Text route; output/integration partial |
| `/dirs` | — | Text route; output/integration partial |
| `/marketplace` | `add`, `remove`, `update`, `list`, `discover`, `install`, `uninstall`, `installed`, `upgrade`, `help` | Text route; output/integration partial |
| `/plugins` | `list`, `enable`, `disable` | Text route; output/integration partial |
| `/reload-plugins` | — | Text route; output/integration partial |
| `/force` | — | Text route; output/integration partial |
| `/forget-approvals` | — | Text route; output/integration partial |
| `/autoresearch` | — | Text route; output/integration partial |
| `/init` | — | Text route; output/integration partial |

## Main launch flags

The raw flags editor exists, but [web/src/pages/SettingsPage.tsx:266](web/src/pages/SettingsPage.tsx#L266) splits on whitespace and loses quoted argument boundaries. Paths with spaces and some structured arguments cannot be assumed to work. Mode/print/interactive flags may conflict with the RPC host. This is an inventory of options, not an instruction to pass every flag.

| Flag | Reachability |
| --- | --- |
| `--model` | GUI equivalent |
| `--smol` | Partial GUI equivalent + raw flags |
| `--slow` | Partial GUI equivalent + raw flags |
| `--plan` | Partial GUI equivalent + raw flags |
| `--goal` | Mode/terminal-specific; not general RPC launch coverage |
| `--prewalk` | Raw launch flags only |
| `--no-prewalk` | Raw launch flags only |
| `--prewalk-into` | Raw launch flags only |
| `--plan-yolo` | Raw launch flags only |
| `--plan-yolo-into` | Raw launch flags only |
| `--provider` | Partial GUI equivalent + raw flags |
| `--api-key` | Raw launch flags only |
| `--system-prompt` | Raw launch flags only |
| `--system-prompt-template` | Raw launch flags only |
| `--append-system-prompt` | Raw launch flags only |
| `--allow-home` | Raw launch flags only |
| `--profile` | Raw launch flags only |
| `--alias` | Mode/terminal-specific; not general RPC launch coverage |
| `--cwd` | GUI equivalent |
| `--mode` | Mode/terminal-specific; not general RPC launch coverage |
| `--config` | Raw launch flags only |
| `--add-dir` | Raw launch flags only |
| `--print` | Mode/terminal-specific; not general RPC launch coverage |
| `--continue` | Partial GUI equivalent + raw flags |
| `--resume` | Partial GUI equivalent + raw flags |
| `--restore` | Raw launch flags only |
| `--from-claude` | Raw launch flags only |
| `--from-codex` | Raw launch flags only |
| `--session-dir` | Raw launch flags only |
| `--no-session` | Raw launch flags only |
| `--models` | Raw launch flags only |
| `--no-tools` | Raw launch flags only |
| `--no-lsp` | Raw launch flags only |
| `--no-pty` | Raw launch flags only |
| `--tools` | Raw launch flags only |
| `--thinking` | GUI equivalent |
| `--service-tier` | Raw launch flags only |
| `--hide-thinking` | Mode/terminal-specific; not general RPC launch coverage |
| `--advisor` | Raw launch flags only |
| `--wait-async` | Mode/terminal-specific; not general RPC launch coverage |
| `--max-time` | Raw launch flags only |
| `--external-thinking` | Raw launch flags only |
| `--hook` | Raw launch flags only |
| `--extension` | Raw launch flags only |
| `--no-extensions` | Raw launch flags only |
| `--no-skills` | Raw launch flags only |
| `--skills` | Raw launch flags only |
| `--no-rules` | Raw launch flags only |
| `--no-context-files` | Raw launch flags only |
| `--export` | Partial GUI equivalent + raw flags |
| `--no-title` | Raw launch flags only |
| `--spinner-interval` | Mode/terminal-specific; not general RPC launch coverage |
| `--max-fps` | Mode/terminal-specific; not general RPC launch coverage |
| `--motion` | Mode/terminal-specific; not general RPC launch coverage |
| `--no-ui` | Raw launch flags only |
| `--print-thoughts` | Mode/terminal-specific; not general RPC launch coverage |
| `--warn-cost` | Raw launch flags only |
| `--max-cost` | Raw launch flags only |
| `--auto-approve` | Partial GUI equivalent + raw flags |
| `--approval-mode` | Partial GUI equivalent + raw flags |

## Native agent tools

OMP retains execution of built-in tools. GUI management/configuration and generic tool-call/result rendering cover the agent-mediated path; no tool was executed in this audit. Browser/computer use run inside eval and depend on native setup/policy. Tool-specific interactive requirements (especially ask), specialized previews, external programs and optional dependencies need acceptance individually. ToolsPanel currently labels tools without a matched enable-setting key as Always available; that inference is not authoritative for launch restrictions or installed dependencies.

| Tool | Matched GUI enable setting | Coverage |
| --- | --- | --- |
| `read` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `edit` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `write` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `bash` | `bash.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `grep` | `grep.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `glob` | `glob.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `find` | `find.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `eval` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `task` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `wait` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `todo` | `todo.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `ask` | `ask.enabled` | Missing native tool UI activation |
| `web_search` | `web_search.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `lsp` | `lsp.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `ast_edit` | `astEdit.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `debug` | `debug.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `ida` | `ida.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `ast_grep` | `astGrep.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `github` | `github.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `checkpoint` | `checkpoint.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |
| `rewind` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `context_notes` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `new_context` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `retain` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `recall` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `reflect` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `memory_edit` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `learn` | No matched gate; fixed label | Agent-mediated; generic output/configuration, no separate execution UI |
| `manage_skill` | `skills.enableSkillCommands` | Agent-mediated; generic output/configuration, no separate execution UI |
| `security_scan` | `security.enabled` | Agent-mediated; generic output/configuration, no separate execution UI |

## Reducer fixture observations

| Observed defect | Present in this snapshot |
| --- | --- |
| slashOutputIgnored | Yes |
| nativeNoticeIgnored | Yes |
| editorTextOnlySetsNotice | Yes |
| checkboxStateDiscarded | Yes |
| cancelDoesNotRemoveTarget | Yes |

The fixtures feed only synthetic command_output, notice, set_editor_text, select and cancel records to the current reducer. They demonstrate client-state behavior, not a live provider/tool run. Option descriptions, secret input, structured ask, widget placement, voice, host-tool/URI responses and UI timeout behavior were additionally source-reviewed; not all were exercised as fixtures.

## Host features versus OMP parity

The classifier routing graph, persona library, project navigation, visual editor, desktop installer and appearance controls are host features. They can be useful and polished without covering missing native OMP operations. Permissions are OMP's authoritative global policy with possible launch/project overrides, not an invented per-chat access switch. Checkpoint navigation changes conversation history, not files; native checkpoint/rewind tools are distinct.

## Reproduce and maintain this map

Run from the repository root with Node 24+ and a working OMP binary (`OMP_BIN` can select it). The collector downloads the public source matching --version and writes only a sanitized inventory under .tmp. It creates and removes its own temporary fixture profile. The report generator rejects unclassified native commands, duplicate mappings and stale local evidence anchors rather than treating new commands as implemented.

```sh
node scripts/collect-omp-inventory.mjs
node scripts/inspect-gui-events.mjs
node scripts/audit-capabilities.mjs
npm run docs:check
```

Curate [scripts/omp-gui-map.json](scripts/omp-gui-map.json), then regenerate this document and [docs/omp-gui-coverage.json](docs/omp-gui-coverage.json). The JSON contains every RPC/CLI/flag/tool/setting row and evidence location, suitable for filtering or a later in-app coverage view. Refresh after an OMP update or when closing a gap; do not turn source evidence or read-probe success into a blanket feature-verification claim.
