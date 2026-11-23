# OMP GUI coverage audit

Checked 2026-11-16T16:50:01.733Z against **omp/18.20.0**. Native inventory revision: b5fa72d; local evidence below is regenerated from the current working tree. **Every audited canonical RPC has a traced route; manual task mutation is intentionally restricted to expert diagnostics. Native CLI operations use guided forms or explicit terminal handoffs. This is reachability, not blanket acceptance testing.**

## Scope and evidence

The versioned inventory contains **74 canonical RPC commands**, **54 top-level CLI commands**, **615 configuration fields**, **49 built-in slash commands (123 advertised subcommands)**, **60 main launch flags**, and **30 help-listed native tools**. These are overlapping surfaces, not a feature-completion percentage.

Primary sources: matching [v18.20.0 RPC types](https://github.com/can1357/oh-my-pi/blob/v18.20.0/packages/coding-agent/src/modes/rpc/rpc-types.ts), [protocol behavior](https://github.com/can1357/oh-my-pi/blob/v18.20.0/docs/rpc.md), [implementation](https://github.com/can1357/oh-my-pi/blob/v18.20.0/packages/coding-agent/src/modes/rpc/rpc-mode.ts), installed --help/config metadata, and the source anchors below. The cached catalog contains 74/74 canonical commands.

**Verification:** 13 native read RPCs passed in a credential-filtered temporary profile. A separate trusted-extension fixture passed startup question delivery, protocol v2 reassembly of a large response and paged loading of 401 synthetic messages. All 54 installed top-level help routes parsed, and one real read-only stats job completed in a disposable profile. Focused tests cover malformed transport, cancellation, replay, task import, quoted argv, native state, host adapters and dictation insertion. Rendered inert browser checks covered native questions/default focus/password inputs, plan edits, branch labels, queue recovery, child transcripts/steering, account listing, dark/light/custom accent and 700px width. These fixtures never sent a model request or changed a real account, setting, package, project file or service.

**Acceptance limits:** real microphones/audio playback, realtime/speech/prediction/side-question providers, goal continuation, model-driven summaries, actual subagents, account login/logout, installers/updaters, native service mutations and cross-platform terminal launches were not exercised. No paid request, real installation, publication or user configuration mutation was used as a test. Arbitrary third-party terminal widgets and host adapters are not automatically converted into React.

## Coverage definitions

| Classification | Meaning |
| --- | --- |
| Direct control | A normal GUI control invokes the native operation and consumes its result or events. |
| Integrated route | Ordinary GUI behavior uses the command or an equivalent native route. |
| Guided native form | Installed help supplies action choices, argument fields and flags; explicit execution has native output, exit state and cancellation. |
| Native terminal handoff | The GUI prepares and explicitly launches/copies a native terminal command. The terminal retains interactive/credential-bearing behavior. |
| Verification | Source reachability and fixtures do not prove live provider, hardware or mutating-operation acceptance. |

## RPC reachability totals

| Classification | Commands |
| --- | --- |
| Direct control | 54 |
| Integrated route | 13 |
| JSON console only | 7 |

## Audited workflows

| Priority | Feature | Route state | Evidence / limits | Local source |
| --- | --- | --- | --- | --- |
| P0 | Tool questions | Implemented | rpc-ui, structured ask and startup replay are connected. The trusted native startup-question fixture passed. Interactive PTYs use the native terminal. | [server/src/index.ts:159](server/src/index.ts#L159) |
| P0 | Slash output and native notices | Implemented | Native output, notices and errors render as bounded transient output; reconnect IDs deduplicate replay. | [web/src/components/RuntimeOutput.tsx:48](web/src/components/RuntimeOutput.tsx#L48) |
| P0 | Dialog cancellation and selection fidelity | Implemented | Native cancellation/deadlines, focused initial option, option descriptions, checkbox round-trips, structured multi-answer questions and protected inputs are preserved. | [web/src/components/Dialogs.tsx:55](web/src/components/Dialogs.tsx#L55) |
| P1 | Extension composer updates | Implemented | Composer text has an Undo backup; widgets respect above/below placement and replay coalesces their latest values. | [web/src/components/Composer.tsx:56](web/src/components/Composer.tsx#L56) |
| P1 | Lossless large RPC frames | Implemented | Native v2 chunking and 401-message paged history passed in a disposable keyless profile. Invalid frames/pages fail visibly. | [server/src/rpc-frames.ts:4](server/src/rpc-frames.ts#L4) |
| P1 | Goal lifecycle and agent-owned tasks | Implemented | Goals remain under advanced session diagnostics. Manual task editing has been removed; task progress remains agent-owned. | [web/src/components/settings/SessionWorkflows.tsx:129](web/src/components/settings/SessionWorkflows.tsx#L129) |
| P1 | Queue management | Implemented | Edit, delete, reorder or steer pending composer drafts. Automatic delivery waits for the owning chat to become idle. | [web/src/components/QueuedMessages.tsx:55](web/src/components/QueuedMessages.tsx#L55) |
| P1 | Subagent conversations and steering | Implemented | Native event subscription, lifecycle/progress roster, incremental child transcript, steering and cancellation. No real subagent/model was spawned for verification. | [web/src/components/SubagentControls.tsx:43](web/src/components/SubagentControls.tsx#L43) |
| P1 | Export/fork/tree completion | Implemented | Scoped export download and refreshed native transitions; tree/append-history picker, labels, summaries and abort. | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| P1 | Provider accounts and MCP authentication | GUI + native handoff | Account-specific sign-out and persistent login links. Secret/pre-URL OAuth and MCP interactive authentication retain the explicit native OMP terminal workflow. No real account changes were tested. | [web/src/components/settings/ProviderAccounts.tsx:18](web/src/components/settings/ProviderAccounts.tsx#L18) |
| P1 | External MCP discovery and import | Implemented | Codex TOML and Claude Code and ZCode JSON are scanned on opening MCP settings. Import copies selected entries into matching OMP scopes as disabled. Fixture tests cover scope, credentials, duplicate names and preserved settings. | [server/src/mcp-discovery.ts](server/src/mcp-discovery.ts) |
| P1 | Settings reachability versus effect | Implemented | Every native field remains searchable. All 23 missing enums have version-pinned choices and unknown future enums use native-validated text input. Global-write, terminal preference and 40 RPC-default effects are identified. | [web/src/components/settings/Controls.tsx:125](web/src/components/settings/Controls.tsx#L125) |
| P1 | Launch flags | Implemented | Quoted argv round-trips preserve Windows paths. Incompatible transport/interactive modes are rejected in GUI launches and are available through the native interactive launcher. API keys are not saved in launch flags. | [shared/launch-args.ts:49](shared/launch-args.ts#L49) |
| P2 | Voice and dictation | Implemented; acceptance pending | UI/events, browser WebRTC/host capture, mute/stop and draft ownership are wired; fixtures cover insertion and cleanup. No microphone, realtime provider, speech engine or paid request was used. | [web/src/components/VoiceControls.tsx:150](web/src/components/VoiceControls.tsx#L150) |
| P2 | Word completion and side questions | Implemented; provider acceptance pending | Native-configured ghost suffix/feedback and separate topic/follow-up stream/history controls are wired. No prediction engine or side-question model was invoked. | [web/src/lib/use-word-completion.ts:21](web/src/lib/use-word-completion.ts#L21) |
| P2 | Host-owned tools and virtual URIs | Implemented | Optional concrete GUI adapters handle request/update/result/cancel and explicit errors. Runtime URI is intentionally read-only. Arbitrary custom adapters are application code, not a JSON registration promise. | [server/src/host-adapters.ts:57](server/src/host-adapters.ts#L57) |
| P2 | Native CLI services and administration | Guided + native handoff | All 54 installed top-level commands are reachable through installed-help forms and native jobs or terminal handoffs. All 54 help routes and one isolated read-only stats job passed; mutations/services were not exercised. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407) |
| P2 | Extension terminal components | Native handoff | Custom terminal renderers/raw-input APIs run in the explicit native OMP launcher; they are not converted to React widgets. Supported standard extension UI methods have GUI adapters. | [server/src/native-operations.ts:228](server/src/native-operations.ts#L228) |

## Every canonical RPC command

| RPC | Reachability | GUI route / limits | Read probe | Local source |
| --- | --- | --- | --- | --- |
| `negotiate_protocol` | Integrated route | Bridge startup. Negotiates v2, strictly reassembles UTF-8 chunks and surfaces malformed/oversized frames. Native large-frame fixture passed. | not executed | [server/src/omp.ts:157](server/src/omp.ts#L157) |
| `prompt` | Direct control | Composer → send and stop. Text/images follow native prompt admission; tool execution and model capability remain OMP-owned. | not executed | [web/src/App.tsx:249](web/src/App.tsx#L249) |
| `steer` | JSON console only | Advanced runtime diagnostics. These commands manage OMP's native queues. The composer holds editable drafts until delivery. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:10](web/src/components/settings/CapabilitiesPanel.tsx#L10) |
| `follow_up` | JSON console only | Advanced runtime diagnostics. These commands manage OMP's native queues. The composer holds editable drafts until delivery. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:10](web/src/components/settings/CapabilitiesPanel.tsx#L10) |
| `remove_queued_message` | JSON console only | Advanced runtime diagnostics. These commands manage OMP's native queues. The composer holds editable drafts until delivery. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:10](web/src/components/settings/CapabilitiesPanel.tsx#L10) |
| `promote_queued_message` | JSON console only | Advanced runtime diagnostics. These commands manage OMP's native queues. The composer holds editable drafts until delivery. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:10](web/src/components/settings/CapabilitiesPanel.tsx#L10) |
| `abort` | Direct control | Composer → send and stop. Text/images follow native prompt admission; tool execution and model capability remain OMP-owned. | not executed | [web/src/App.tsx:249](web/src/App.tsx#L249) |
| `abort_and_prompt` | Direct control | Composer → queued message → Steer. Interrupts the current turn and sends the chosen draft with attachments. | fixture only | [web/src/lib/composer-queue.ts:52](web/src/lib/composer-queue.ts#L52) |
| `abort_and_restore_queue` | JSON console only | Advanced runtime diagnostics. These commands manage OMP's native queues. The composer holds editable drafts until delivery. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:10](web/src/components/settings/CapabilitiesPanel.tsx#L10) |
| `new_session` | Direct control | Settings → Session. Successful session transitions broadcast fresh native history; HTML export returns a scoped download. Cancelled transitions do not replace the transcript. | not executed | [server/src/index.ts:484](server/src/index.ts#L484) |
| `open_session` | Direct control | Settings → Session workflows. Advanced session diagnostics: directory sessions and native goal lifecycle/budget. Task progress is agent-owned. | not executed | [web/src/components/settings/SessionWorkflows.tsx:129](web/src/components/settings/SessionWorkflows.tsx#L129) |
| `get_state` | Integrated route | Chat initialization, selectors and usage. Normal GUI reads; no invented progress or totals. | passed | [web/src/App.tsx:164](web/src/App.tsx#L164) |
| `set_fast_mode` | Direct control | Composer and Settings → Session. Fast mode requires both native model and provider support. | not executed | [web/src/App.tsx:668](web/src/App.tsx#L668) |
| `set_slow_mode` | Direct control | Settings → Session. Native session controls; slow mode shows its reported scope. Retry uses explicit enable/disable actions because get_state does not report its current setting. | not executed | [web/src/pages/SettingsPage.tsx:444](web/src/pages/SettingsPage.tsx#L444) |
| `goal` | Direct control | Settings → Session workflows. Advanced session diagnostics: directory sessions and native goal lifecycle/budget. Task progress is agent-owned. | not executed | [web/src/components/settings/SessionWorkflows.tsx:129](web/src/components/settings/SessionWorkflows.tsx#L129) |
| `set_ask_dialog` | Integrated route | Bridge startup and native questions. GUI uses rpc-ui and structured ask opt-in. Startup questions are replayed before initialization completes. Interactive PTYs remain a native-terminal boundary. | not executed | [server/src/index.ts:159](server/src/index.ts#L159) |
| `get_available_commands` | Integrated route | Chat initialization, selectors and usage. Normal GUI reads; no invented progress or totals. | passed | [web/src/App.tsx:164](web/src/App.tsx#L164) |
| `get_entries` | Direct control | Settings → Session workflows → branches and checkpoints. Native tree/append-history selection, labels, fork/branch/navigation, optional model summaries with cancellation, compaction instructions and handoff. These actions may modify history or use the session model. | passed | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| `get_tree` | Direct control | Settings → Session workflows → branches and checkpoints. Native tree/append-history selection, labels, fork/branch/navigation, optional model summaries with cancellation, compaction instructions and handoff. These actions may modify history or use the session model. | passed | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| `set_todos` | JSON console only | Advanced runtime diagnostics. Manual task mutation was intentionally removed from Session settings. Agent-owned progress remains in the conversation task plan; expert RPC access remains available. | not executed | [web/src/components/settings/CapabilitiesPanel.tsx:10](web/src/components/settings/CapabilitiesPanel.tsx#L10) |
| `set_host_tools` | Direct control | Settings → Session → GUI host integration. Opt-in GUI notice tool and read-only runtime URI. Host adapters handle calls, updates/results, URI errors and cancellation; unknown registrations fail explicitly. Arbitrary third-party host behavior still requires an implementation. | not executed | [server/src/host-adapters.ts:8](server/src/host-adapters.ts#L8) |
| `set_host_uri_schemes` | Direct control | Settings → Session → GUI host integration. Opt-in GUI notice tool and read-only runtime URI. Host adapters handle calls, updates/results, URI errors and cancellation; unknown registrations fail explicitly. Arbitrary third-party host behavior still requires an implementation. | not executed | [server/src/host-adapters.ts:8](server/src/host-adapters.ts#L8) |
| `set_subagent_subscription` | Direct control | Runtime capabilities → Advanced event transport. Bridge defaults to full native events and subagent events. Explicit controls can choose delta updates, event names and subscription level. | not executed | [web/src/components/settings/TransportControls.tsx:69](web/src/components/settings/TransportControls.tsx#L69) |
| `set_event_filter` | Direct control | Runtime capabilities → Advanced event transport. Bridge defaults to full native events and subagent events. Explicit controls can choose delta updates, event names and subscription level. | not executed | [web/src/components/settings/TransportControls.tsx:69](web/src/components/settings/TransportControls.tsx#L69) |
| `get_subagents` | Integrated route | Workspace agent roster. Native snapshots plus lifecycle/progress events; terminal statuses are retained as reported history. | passed | [web/src/App.tsx:201](web/src/App.tsx#L201) |
| `get_subagent_messages` | Direct control | Workspace cards → Agents. Incremental registered child transcripts, steering and cancellation. Polls are invalidated on selection/chat changes. | not executed | [web/src/components/SubagentControls.tsx:43](web/src/components/SubagentControls.tsx#L43) |
| `cancel_subagent` | Direct control | Workspace cards → Agents. Incremental registered child transcripts, steering and cancellation. Polls are invalidated on selection/chat changes. | not executed | [web/src/components/SubagentControls.tsx:43](web/src/components/SubagentControls.tsx#L43) |
| `steer_subagent` | Direct control | Workspace cards → Agents. Incremental registered child transcripts, steering and cancellation. Polls are invalidated on selection/chat changes. | not executed | [web/src/components/SubagentControls.tsx:43](web/src/components/SubagentControls.tsx#L43) |
| `live_start` | Direct control | Composer → Voice and dictation. Host microphone or Opus WebRTC live sessions, mute/stop and transcripts; capture-correlated draft-only dictation with insert-once and navigation cleanup. Hardware/provider acceptance remains unverified. | not executed | [web/src/components/VoiceControls.tsx:199](web/src/components/VoiceControls.tsx#L199) |
| `live_connect` | Direct control | Composer → Voice and dictation. Host microphone or Opus WebRTC live sessions, mute/stop and transcripts; capture-correlated draft-only dictation with insert-once and navigation cleanup. Hardware/provider acceptance remains unverified. | not executed | [web/src/components/VoiceControls.tsx:199](web/src/components/VoiceControls.tsx#L199) |
| `live_stop` | Direct control | Composer → Voice and dictation. Host microphone or Opus WebRTC live sessions, mute/stop and transcripts; capture-correlated draft-only dictation with insert-once and navigation cleanup. Hardware/provider acceptance remains unverified. | not executed | [web/src/components/VoiceControls.tsx:199](web/src/components/VoiceControls.tsx#L199) |
| `live_mute` | Direct control | Composer → Voice and dictation. Host microphone or Opus WebRTC live sessions, mute/stop and transcripts; capture-correlated draft-only dictation with insert-once and navigation cleanup. Hardware/provider acceptance remains unverified. | not executed | [web/src/components/VoiceControls.tsx:199](web/src/components/VoiceControls.tsx#L199) |
| `dictation_start` | Direct control | Composer → Voice and dictation. Host microphone or Opus WebRTC live sessions, mute/stop and transcripts; capture-correlated draft-only dictation with insert-once and navigation cleanup. Hardware/provider acceptance remains unverified. | not executed | [web/src/components/VoiceControls.tsx:199](web/src/components/VoiceControls.tsx#L199) |
| `dictation_stop` | Direct control | Composer → Voice and dictation. Host microphone or Opus WebRTC live sessions, mute/stop and transcripts; capture-correlated draft-only dictation with insert-once and navigation cleanup. Hardware/provider acceptance remains unverified. | not executed | [web/src/components/VoiceControls.tsx:199](web/src/components/VoiceControls.tsx#L199) |
| `set_model` | Direct control | Composer and Settings → Session. Fast mode requires both native model and provider support. | not executed | [web/src/App.tsx:668](web/src/App.tsx#L668) |
| `cycle_model` | Direct control | Settings → Session workflows → execution. Native delivery, retry/cache controls, shell execution with context exclusion and cancellation, ownership reads and model/thinking cycling. Shell output is native; interactive PTY use is a terminal handoff. | not executed | [web/src/components/settings/SessionWorkflows.tsx:437](web/src/components/settings/SessionWorkflows.tsx#L437) |
| `get_available_models` | Integrated route | Chat initialization, selectors and usage. Normal GUI reads; no invented progress or totals. | passed | [web/src/App.tsx:164](web/src/App.tsx#L164) |
| `set_thinking_level` | Direct control | Composer and Settings → Session. Fast mode requires both native model and provider support. | not executed | [web/src/App.tsx:668](web/src/App.tsx#L668) |
| `cycle_thinking_level` | Direct control | Settings → Session workflows → execution. Native delivery, retry/cache controls, shell execution with context exclusion and cancellation, ownership reads and model/thinking cycling. Shell output is native; interactive PTY use is a terminal handoff. | not executed | [web/src/components/settings/SessionWorkflows.tsx:437](web/src/components/settings/SessionWorkflows.tsx#L437) |
| `get_available_thinking_levels` | Integrated route | Chat initialization, selectors and usage. Normal GUI reads; no invented progress or totals. | passed | [web/src/App.tsx:164](web/src/App.tsx#L164) |
| `set_steering_mode` | Direct control | Settings → Session. Native session controls; slow mode shows its reported scope. Retry uses explicit enable/disable actions because get_state does not report its current setting. | not executed | [web/src/pages/SettingsPage.tsx:444](web/src/pages/SettingsPage.tsx#L444) |
| `set_follow_up_mode` | Direct control | Settings → Session. Native session controls; slow mode shows its reported scope. Retry uses explicit enable/disable actions because get_state does not report its current setting. | not executed | [web/src/pages/SettingsPage.tsx:444](web/src/pages/SettingsPage.tsx#L444) |
| `set_interrupt_mode` | Direct control | Settings → Session workflows → execution. Native delivery, retry/cache controls, shell execution with context exclusion and cancellation, ownership reads and model/thinking cycling. Shell output is native; interactive PTY use is a terminal handoff. | not executed | [web/src/components/settings/SessionWorkflows.tsx:437](web/src/components/settings/SessionWorkflows.tsx#L437) |
| `compact` | Direct control | Settings → Session workflows → branches and checkpoints. Native tree/append-history selection, labels, fork/branch/navigation, optional model summaries with cancellation, compaction instructions and handoff. These actions may modify history or use the session model. | not executed | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| `set_auto_compaction` | Direct control | Settings → Session. Native session controls; slow mode shows its reported scope. Retry uses explicit enable/disable actions because get_state does not report its current setting. | not executed | [web/src/pages/SettingsPage.tsx:444](web/src/pages/SettingsPage.tsx#L444) |
| `set_cache_warming` | Direct control | Settings → Session workflows → execution. Native delivery, retry/cache controls, shell execution with context exclusion and cancellation, ownership reads and model/thinking cycling. Shell output is native; interactive PTY use is a terminal handoff. | not executed | [web/src/components/settings/SessionWorkflows.tsx:437](web/src/components/settings/SessionWorkflows.tsx#L437) |
| `set_auto_retry` | Direct control | Settings → Session. Native session controls; slow mode shows its reported scope. Retry uses explicit enable/disable actions because get_state does not report its current setting. | not executed | [web/src/pages/SettingsPage.tsx:444](web/src/pages/SettingsPage.tsx#L444) |
| `abort_retry` | Direct control | Settings → Session workflows → execution. Native delivery, retry/cache controls, shell execution with context exclusion and cancellation, ownership reads and model/thinking cycling. Shell output is native; interactive PTY use is a terminal handoff. | not executed | [web/src/components/settings/SessionWorkflows.tsx:437](web/src/components/settings/SessionWorkflows.tsx#L437) |
| `bash` | Direct control | Settings → Session workflows → execution. Native delivery, retry/cache controls, shell execution with context exclusion and cancellation, ownership reads and model/thinking cycling. Shell output is native; interactive PTY use is a terminal handoff. | not executed | [web/src/components/settings/SessionWorkflows.tsx:437](web/src/components/settings/SessionWorkflows.tsx#L437) |
| `abort_bash` | Direct control | Settings → Session workflows → execution. Native delivery, retry/cache controls, shell execution with context exclusion and cancellation, ownership reads and model/thinking cycling. Shell output is native; interactive PTY use is a terminal handoff. | not executed | [web/src/components/settings/SessionWorkflows.tsx:437](web/src/components/settings/SessionWorkflows.tsx#L437) |
| `get_session_stats` | Integrated route | Chat initialization, selectors and usage. Normal GUI reads; no invented progress or totals. | passed | [web/src/App.tsx:164](web/src/App.tsx#L164) |
| `get_session_lease` | Direct control | Settings → Session workflows → execution. Native delivery, retry/cache controls, shell execution with context exclusion and cancellation, ownership reads and model/thinking cycling. Shell output is native; interactive PTY use is a terminal handoff. | not executed | [web/src/components/settings/SessionWorkflows.tsx:437](web/src/components/settings/SessionWorkflows.tsx#L437) |
| `export_html` | Direct control | Settings → Session. Successful session transitions broadcast fresh native history; HTML export returns a scoped download. Cancelled transitions do not replace the transcript. | not executed | [server/src/index.ts:484](server/src/index.ts#L484) |
| `switch_session` | Integrated route | Saved chats and session transitions. Selected saved files use switch_session. --no-session is rejected for saved-chat loading rather than displaying a false empty transcript. | not executed | [server/src/snapshot.ts:4](server/src/snapshot.ts#L4) |
| `branch` | Direct control | Settings → Session workflows → branches and checkpoints. Native tree/append-history selection, labels, fork/branch/navigation, optional model summaries with cancellation, compaction instructions and handoff. These actions may modify history or use the session model. | not executed | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| `fork` | Direct control | Settings → Session. Successful session transitions broadcast fresh native history; HTML export returns a scoped download. Cancelled transitions do not replace the transcript. | not executed | [server/src/index.ts:484](server/src/index.ts#L484) |
| `navigate_tree` | Direct control | Settings → Session workflows → branches and checkpoints. Native tree/append-history selection, labels, fork/branch/navigation, optional model summaries with cancellation, compaction instructions and handoff. These actions may modify history or use the session model. | not executed | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| `abort_branch_summary` | Direct control | Settings → Session workflows → branches and checkpoints. Native tree/append-history selection, labels, fork/branch/navigation, optional model summaries with cancellation, compaction instructions and handoff. These actions may modify history or use the session model. | not executed | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| `set_label` | Direct control | Settings → Session workflows → branches and checkpoints. Native tree/append-history selection, labels, fork/branch/navigation, optional model summaries with cancellation, compaction instructions and handoff. These actions may modify history or use the session model. | not executed | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| `get_branch_messages` | Direct control | Settings → Session workflows → branches and checkpoints. Native tree/append-history selection, labels, fork/branch/navigation, optional model summaries with cancellation, compaction instructions and handoff. These actions may modify history or use the session model. | passed | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| `get_last_assistant_text` | Direct control | Settings → Session workflows → branches and checkpoints. Native tree/append-history selection, labels, fork/branch/navigation, optional model summaries with cancellation, compaction instructions and handoff. These actions may modify history or use the session model. | passed | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| `set_session_name` | Direct control | Settings → Session. Native session controls; slow mode shows its reported scope. Retry uses explicit enable/disable actions because get_state does not report its current setting. | not executed | [web/src/pages/SettingsPage.tsx:444](web/src/pages/SettingsPage.tsx#L444) |
| `handoff` | Direct control | Settings → Session workflows → branches and checkpoints. Native tree/append-history selection, labels, fork/branch/navigation, optional model summaries with cancellation, compaction instructions and handoff. These actions may modify history or use the session model. | not executed | [web/src/components/settings/SessionWorkflows.tsx:152](web/src/components/settings/SessionWorkflows.tsx#L152) |
| `get_messages` | Integrated route | Transcript snapshots. Protocol v2 pages stable history; stale/busy cursors discard partial pages and fall back to a full logical frame. A 401-message native fixture passed. | passed | [server/src/snapshot.ts:28](server/src/snapshot.ts#L28) |
| `get_messages_page` | Integrated route | Transcript snapshots. Protocol v2 pages stable history; stale/busy cursors discard partial pages and fall back to a full logical frame. A 401-message native fixture passed. | passed | [server/src/snapshot.ts:28](server/src/snapshot.ts#L28) |
| `get_login_providers` | Direct control | Settings → Providers. Provider login has a persistent browser link, native question handling and account-specific sign-out confirmation. Secret/pre-URL flows rejected by upstream RPC use Native operations → login. | not executed | [web/src/components/settings/ProviderAccounts.tsx:18](web/src/components/settings/ProviderAccounts.tsx#L18) |
| `login` | Direct control | Settings → Providers. Provider login has a persistent browser link, native question handling and account-specific sign-out confirmation. Secret/pre-URL flows rejected by upstream RPC use Native operations → login. | not executed | [web/src/components/settings/ProviderAccounts.tsx:18](web/src/components/settings/ProviderAccounts.tsx#L18) |
| `get_logout_accounts` | Direct control | Settings → Providers. Provider login has a persistent browser link, native question handling and account-specific sign-out confirmation. Secret/pre-URL flows rejected by upstream RPC use Native operations → login. | not executed | [web/src/components/settings/ProviderAccounts.tsx:18](web/src/components/settings/ProviderAccounts.tsx#L18) |
| `logout` | Direct control | Settings → Providers. Provider login has a persistent browser link, native question handling and account-specific sign-out confirmation. Secret/pre-URL flows rejected by upstream RPC use Native operations → login. | not executed | [web/src/components/settings/ProviderAccounts.tsx:18](web/src/components/settings/ProviderAccounts.tsx#L18) |
| `predict_word` | Integrated route | Composer → native ghost text / Tab / Escape. Debounced end-of-draft prediction obeys native spelling configuration, UTF-16 cursor positions, IME/focus and stale-request guards; acceptance/rejection feedback uses the original request. | not executed | [web/src/lib/use-word-completion.ts:21](web/src/lib/use-word-completion.ts#L21) |
| `predict_word_feedback` | Integrated route | Composer → native ghost text / Tab / Escape. Debounced end-of-draft prediction obeys native spelling configuration, UTF-16 cursor positions, IME/focus and stale-request guards; acceptance/rejection feedback uses the original request. | not executed | [web/src/lib/use-word-completion.ts:21](web/src/lib/use-word-completion.ts#L21) |
| `btw` | Direct control | Settings → Session workflows → side questions. Native topic/follow-up selection, streamed turns, cancellation and restored history. Side answers stay outside the transcript. | not executed | [web/src/components/settings/SessionWorkflows.tsx:455](web/src/components/settings/SessionWorkflows.tsx#L455) |
| `btw_cancel` | Direct control | Settings → Session workflows → side questions. Native topic/follow-up selection, streamed turns, cancellation and restored history. Side answers stay outside the transcript. | not executed | [web/src/components/settings/SessionWorkflows.tsx:455](web/src/components/settings/SessionWorkflows.tsx#L455) |
| `get_btw_history` | Direct control | Settings → Session workflows → side questions. Native topic/follow-up selection, streamed turns, cancellation and restored history. Side answers stay outside the transcript. | passed | [web/src/components/settings/SessionWorkflows.tsx:455](web/src/components/settings/SessionWorkflows.tsx#L455) |

## Configuration fields

All **615** native fields remain searchable. **0 enum controls lack choices**; unknown future enums also have a native-validated text fallback. Version-pinned supplemental enums restore imported/factory-defined native choices. Forty source-declared RPC-neutral preferences carry an effect note. Global configuration writes, active-session controls and terminal display preferences are identified separately. The forms do not silently override native RPC defaults. See [web/src/components/settings/Controls.tsx:63](web/src/components/settings/Controls.tsx#L63).

| Category | Fields |
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

All enum keys in the audited schema have native choices.

The machine-readable report includes all setting keys/types and metadata reachability; private effective values are excluded. Configuration defaults and command arguments still require native validation after an OMP update.

## Every top-level CLI command

| CLI command | Reachability | GUI route / limits | Local source |
| --- | --- | --- | --- |
| `omp acp` | Native terminal handoff | Settings → Native operations → acp. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp agents` | Guided native form | Settings → Native operations → agents. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp anonymize` | Guided native form | Settings → Native operations → anonymize. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp auth` | Native terminal handoff | Settings → Native operations → auth. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp auth-broker` | Native terminal handoff | Settings → Native operations → auth-broker. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp auth-gateway` | Native terminal handoff | Settings → Native operations → auth-gateway. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp bash` | Native terminal handoff | Settings → Native operations → bash. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp bench` | Guided native form | Settings → Native operations → bench. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp browser-relay` | Guided native form | Settings → Native operations → browser-relay. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp cleanse` | Guided native form | Settings → Native operations → cleanse. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp clip` | Native terminal handoff | Settings → Native operations → clip. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp collab` | Guided native form | Settings → Native operations → collab. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp commit` | Guided native form | Settings → Native operations → commit. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp completions` | Native terminal handoff | Settings → Native operations → completions. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp compress` | Guided native form | Settings → Native operations → compress. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp config` | Native terminal handoff | Settings → Native operations → config. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp dry-balance` | Guided native form | Settings → Native operations → dry-balance. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp find` | Guided native form | Settings → Native operations → find. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp gallery` | Native terminal handoff | Settings → Native operations → gallery. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp gc` | Guided native form | Settings → Native operations → gc. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp git` | Native terminal handoff | Settings → Native operations → git. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp grep` | Guided native form | Settings → Native operations → grep. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp grievances` | Guided native form | Settings → Native operations → grievances. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp if-bench` | Guided native form | Settings → Native operations → if-bench. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp images` | Guided native form | Settings → Native operations → images. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp install` | Guided native form | Settings → Native operations → install. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp join` | Native terminal handoff | Settings → Native operations → join. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp login` | Native terminal handoff | Settings → Native operations → login. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp models` | Guided native form | Settings → Native operations → models. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp play` | Native terminal handoff | Settings → Native operations → play. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp plugin` | Guided native form | Settings → Native operations → plugin. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp predict` | Native terminal handoff | Settings → Native operations → predict. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp ps` | Guided native form | Settings → Native operations → ps. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp read` | Guided native form | Settings → Native operations → read. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp render` | Native terminal handoff | Settings → Native operations → render. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp say` | Guided native form | Settings → Native operations → say. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp search` | Guided native form | Settings → Native operations → search. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp session` | Guided native form | Settings → Native operations → session. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp setup` | Guided native form | Settings → Native operations → setup. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp sh` | Native terminal handoff | Settings → Native operations → sh. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp share` | Native terminal handoff | Settings → Native operations → share. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp shell` | Native terminal handoff | Settings → Native operations → shell. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp skill` | Guided native form | Settings → Native operations → skill. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp ssh` | Guided native form | Settings → Native operations → ssh. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp stats` | Guided native form | Settings → Native operations → stats. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp stream` | Native terminal handoff | Settings → Native operations → stream. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp tiny-models` | Guided native form | Settings → Native operations → tiny-models. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp token` | Native terminal handoff | Settings → Native operations → token. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp toks` | Guided native form | Settings → Native operations → toks. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp ttsr` | Guided native form | Settings → Native operations → ttsr. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp update` | Guided native form | Settings → Native operations → update. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp usage` | Guided native form | Settings → Native operations → usage. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp worktree` | Guided native form | Settings → Native operations → worktree. Arguments, advertised action choices and flags come from installed help; an explicit Run starts a tracked native job with real output/exit status and cancellation. Terminal launch is also available. Account-token subactions are forced to the terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |
| `omp zsh` | Native terminal handoff | Settings → Native operations → zsh. Schema-backed command preparation and explicit native-terminal launch/copy. Credential-bearing and terminal-renderer output stays in that terminal. | [web/src/components/settings/NativeManager.tsx:407](web/src/components/settings/NativeManager.tsx#L407), [server/src/native-operations.ts:56](server/src/native-operations.ts#L56) |

The native manager obtains metadata from the installed executable, builds argv without evaluating shell text, and never runs operations when loading a page. Credential/token flows and terminal renderers retain native-terminal ownership. Native command completion is reported from process exit, not inferred from a button click. The profile and working folder are explicit. Jobs expose their real output and cancellation; service state is read through native status/process operations.

## Slash commands

Built-in/extension commands are discovered from the active OMP session and sent through normal prompting. command_output, notices, errors and supported questions are rendered. Commands that require native terminal components use the interactive launcher; text routing is not a claim that their terminal widgets were ported.

| Slash command | Advertised subcommands | Entry route |
| --- | --- | --- |
| `/security` | `plan`, `scan`, `status`, `cancel`, `scans`, `show`, `import`, `export`, `validate`, `compare`, `disposition` | Composer; native-terminal fallback for interactive renderers |
| `/model` | — | Composer; native-terminal fallback for interactive renderers |
| `/switch` | — | Composer; native-terminal fallback for interactive renderers |
| `/fast` | `on`, `ultra`, `off`, `status` | Composer; native-terminal fallback for interactive renderers |
| `/slow` | `on`, `off`, `status` | Composer; native-terminal fallback for interactive renderers |
| `/skillful` | `on`, `off`, `status` | Composer; native-terminal fallback for interactive renderers |
| `/extended-context` | `on`, `off`, `status` | Composer; native-terminal fallback for interactive renderers |
| `/computer` | `on`, `off`, `status` | Composer; native-terminal fallback for interactive renderers |
| `/ratchet` | — | Composer; native-terminal fallback for interactive renderers |
| `/prewalk` | `restart`, `off` | Composer; native-terminal fallback for interactive renderers |
| `/modelpreset` | `list`, `save`, `switch`, `delete` | Composer; native-terminal fallback for interactive renderers |
| `/effort` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, `auto` | Composer; native-terminal fallback for interactive renderers |
| `/advisor` | `on`, `off`, `status`, `dump`, `configure` | Composer; native-terminal fallback for interactive renderers |
| `/export` | — | Composer; native-terminal fallback for interactive renderers |
| `/trace` | — | Composer; native-terminal fallback for interactive renderers |
| `/dump` | `all`, `anon` | Composer; native-terminal fallback for interactive renderers |
| `/share` | — | Composer; native-terminal fallback for interactive renderers |
| `/browser` | `headless`, `visible` | Composer; native-terminal fallback for interactive renderers |
| `/todo` | `edit`, `copy`, `expand`, `collapse`, `export`, `import`, `append`, `start`, `done`, `drop`, `rm` | Composer; native-terminal fallback for interactive renderers |
| `/session` | `info`, `delete`, `pin` | Composer; native-terminal fallback for interactive renderers |
| `/jobs` | `full`, `kill` | Composer; native-terminal fallback for interactive renderers |
| `/usage` | `show`, `reset` | Composer; native-terminal fallback for interactive renderers |
| `/stats` | — | Composer; native-terminal fallback for interactive renderers |
| `/changelog` | `full`, `last` | Composer; native-terminal fallback for interactive renderers |
| `/tools` | — | Composer; native-terminal fallback for interactive renderers |
| `/context` | — | Composer; native-terminal fallback for interactive renderers |
| `/mcp` | `add`, `list`, `remove`, `test`, `reauth`, `unauth`, `enable`, `disable`, `reconnect`, `reload`, `resources`, `prompts`, `notifications`, `help` | Composer; native-terminal fallback for interactive renderers |
| `/ssh` | `add`, `list`, `remove`, `help` | Composer; native-terminal fallback for interactive renderers |
| `/fresh` | — | Composer; native-terminal fallback for interactive renderers |
| `/compact` | `soft`, `remote`, `snapcompact` | Composer; native-terminal fallback for interactive renderers |
| `/shake` | `elide`, `images`, `thinking` | Composer; native-terminal fallback for interactive renderers |
| `/handoff` | — | Composer; native-terminal fallback for interactive renderers |
| `/pin` | — | Composer; native-terminal fallback for interactive renderers |
| `/unpin` | — | Composer; native-terminal fallback for interactive renderers |
| `/retry` | — | Composer; native-terminal fallback for interactive renderers |
| `/memory` | `view`, `stats`, `diagnose`, `queue`, `sync`, `clear`, `reset`, `enqueue`, `rebuild`, `mm list`, `mm show`, `mm refresh`, `mm history`, `mm seed`, `mm delete`, `mm reload` | Composer; native-terminal fallback for interactive renderers |
| `/rename` | — | Composer; native-terminal fallback for interactive renderers |
| `/move` | — | Composer; native-terminal fallback for interactive renderers |
| `/wt` | — | Composer; native-terminal fallback for interactive renderers |
| `/add-dir` | — | Composer; native-terminal fallback for interactive renderers |
| `/remove-dir` | — | Composer; native-terminal fallback for interactive renderers |
| `/dirs` | — | Composer; native-terminal fallback for interactive renderers |
| `/marketplace` | `add`, `remove`, `update`, `list`, `discover`, `install`, `uninstall`, `installed`, `upgrade`, `help` | Composer; native-terminal fallback for interactive renderers |
| `/plugins` | `list`, `enable`, `disable` | Composer; native-terminal fallback for interactive renderers |
| `/reload-plugins` | — | Composer; native-terminal fallback for interactive renderers |
| `/force` | — | Composer; native-terminal fallback for interactive renderers |
| `/forget-approvals` | — | Composer; native-terminal fallback for interactive renderers |
| `/autoresearch` | — | Composer; native-terminal fallback for interactive renderers |
| `/init` | — | Composer; native-terminal fallback for interactive renderers |

## Main launch flags

The shared argv parser preserves quotes, empty arguments and Windows paths ([shared/launch-args.ts:2](shared/launch-args.ts#L2)). GUI launch validation rejects transport replacement, incompatible main modes and browser-stored API keys. The native interactive launcher exposes main CLI arguments/flags through help-driven forms.

| Flag | Reachability |
| --- | --- |
| `--model` | GUI equivalent + native launcher |
| `--smol` | Quoted GUI argv + native launcher |
| `--slow` | Quoted GUI argv + native launcher |
| `--plan` | Quoted GUI argv + native launcher |
| `--goal` | Native interactive launcher; incompatible GUI transport overrides are rejected |
| `--prewalk` | Quoted GUI argv + native launcher |
| `--no-prewalk` | Quoted GUI argv + native launcher |
| `--prewalk-into` | Quoted GUI argv + native launcher |
| `--plan-yolo` | Quoted GUI argv + native launcher |
| `--plan-yolo-into` | Quoted GUI argv + native launcher |
| `--provider` | Quoted GUI argv + native launcher |
| `--api-key` | Credential input stays in native terminal/provider configuration |
| `--system-prompt` | Quoted GUI argv + native launcher |
| `--system-prompt-template` | Quoted GUI argv + native launcher |
| `--append-system-prompt` | Quoted GUI argv + native launcher |
| `--allow-home` | Quoted GUI argv + native launcher |
| `--profile` | Quoted GUI argv + native launcher |
| `--alias` | Native interactive launcher; incompatible GUI transport overrides are rejected |
| `--cwd` | GUI equivalent + native launcher |
| `--mode` | Native interactive launcher; incompatible GUI transport overrides are rejected |
| `--config` | Quoted GUI argv + native launcher |
| `--add-dir` | Quoted GUI argv + native launcher |
| `--print` | Native interactive launcher; incompatible GUI transport overrides are rejected |
| `--continue` | Quoted GUI argv + native launcher |
| `--resume` | Quoted GUI argv + native launcher |
| `--restore` | Quoted GUI argv + native launcher |
| `--from-claude` | Quoted GUI argv + native launcher |
| `--from-codex` | Quoted GUI argv + native launcher |
| `--session-dir` | Quoted GUI argv + native launcher |
| `--no-session` | Quoted GUI argv + native launcher |
| `--models` | Quoted GUI argv + native launcher |
| `--no-tools` | Quoted GUI argv + native launcher |
| `--no-lsp` | Quoted GUI argv + native launcher |
| `--no-pty` | Quoted GUI argv + native launcher |
| `--tools` | Quoted GUI argv + native launcher |
| `--thinking` | GUI equivalent + native launcher |
| `--service-tier` | Quoted GUI argv + native launcher |
| `--hide-thinking` | Native interactive launcher; incompatible GUI transport overrides are rejected |
| `--advisor` | Quoted GUI argv + native launcher |
| `--wait-async` | Native interactive launcher; incompatible GUI transport overrides are rejected |
| `--max-time` | Quoted GUI argv + native launcher |
| `--external-thinking` | Quoted GUI argv + native launcher |
| `--hook` | Quoted GUI argv + native launcher |
| `--extension` | Quoted GUI argv + native launcher |
| `--no-extensions` | Quoted GUI argv + native launcher |
| `--no-skills` | Quoted GUI argv + native launcher |
| `--skills` | Quoted GUI argv + native launcher |
| `--no-rules` | Quoted GUI argv + native launcher |
| `--no-context-files` | Quoted GUI argv + native launcher |
| `--export` | Quoted GUI argv + native launcher |
| `--no-title` | Quoted GUI argv + native launcher |
| `--spinner-interval` | Native interactive launcher; incompatible GUI transport overrides are rejected |
| `--max-fps` | Native interactive launcher; incompatible GUI transport overrides are rejected |
| `--motion` | Native interactive launcher; incompatible GUI transport overrides are rejected |
| `--no-ui` | Quoted GUI argv + native launcher |
| `--print-thoughts` | Native interactive launcher; incompatible GUI transport overrides are rejected |
| `--warn-cost` | Quoted GUI argv + native launcher |
| `--max-cost` | Quoted GUI argv + native launcher |
| `--auto-approve` | Quoted GUI argv + native launcher |
| `--approval-mode` | Quoted GUI argv + native launcher |

## Native agent tools

OMP owns execution, approval policy and optional dependencies. The GUI renders native tool calls/results and structured tool questions. No model-driven tool execution was used for acceptance. Tools without a known configuration gate are labelled Runtime-managed; a check appears only when the active session reports that tool.

| Tool | Matched enable setting | Route |
| --- | --- | --- |
| `read` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `edit` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `write` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `bash` | `bash.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `grep` | `grep.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `glob` | `glob.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `find` | `find.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `eval` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `task` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `wait` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `todo` | `todo.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `ask` | `ask.enabled` | Native rpc-ui questions with structured answers and standard extension dialogs |
| `web_search` | `web_search.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `lsp` | `lsp.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `ast_edit` | `astEdit.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `debug` | `debug.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `ida` | `ida.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `ast_grep` | `astGrep.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `github` | `github.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `checkpoint` | `checkpoint.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `rewind` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `context_notes` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `new_context` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `retain` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `recall` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `reflect` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `memory_edit` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `learn` | Runtime-managed | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `manage_skill` | `skills.enableSkillCommands` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |
| `security_scan` | `security.enabled` | Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies |

## Reducer fixture observations

| Original defect | Still present |
| --- | --- |
| slashOutputIgnored | No |
| nativeNoticeIgnored | No |
| editorTextOnlySetsNotice | No |
| checkboxStateDiscarded | No |
| cancelDoesNotRemoveTarget | No |

These observations use synthetic records. Native protocol/history checks and rendered inert UI checks are separate evidence; a successful read RPC is not a mutation test.

## Host features and upstream boundaries

Project navigation, appearance, editor drafts and the desktop shell remain shared web/Tauri host features. They preserve the approved material hierarchy and native OMP permissions. Checkpoint history changes do not roll back files. Custom terminal renderers/raw-input APIs retain a native-terminal handoff, and arbitrary host tools/URI schemes require actual host handlers. The bundled GUI runtime URI is read-only and optional; unknown host requests fail explicitly instead of hanging.

## Reproduce and maintain

Inspect scripts before execution. The checks below use temporary fixture profiles and do not invoke a model; the inventory collector downloads public sources matching the installed OMP version. Mutating integration scripts elsewhere in the repository are not implied by this list.

```sh
node scripts/collect-omp-inventory.mjs
node scripts/check-rpc-parity.mjs
node scripts/check-native-operations.mjs
node scripts/check-api-origin.mjs
node scripts/inspect-gui-events.mjs
node scripts/audit-capabilities.mjs
npm run typecheck
npm test
npm run build
npm run docs:check
```

Curate [scripts/omp-gui-map.json](scripts/omp-gui-map.json), then regenerate this document and [docs/omp-gui-coverage.json](docs/omp-gui-coverage.json). The generator rejects unmapped commands, duplicates and stale evidence. Refresh enum/protocol metadata after an OMP update. Keep live acceptance limits explicit.
