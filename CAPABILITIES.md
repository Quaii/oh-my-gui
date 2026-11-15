# Installed OMP capability audit

Checked 2026-11-14T15:29:15.048Z against omp/18.20.0. The native settings catalog contains 615 fields.

Read-only methods are probed against the running binary. Mutating methods are documented and accessible through Advanced controls, but are not executed during an audit.

“Advanced console” means the command can be composed and submitted from Settings → Runtime capabilities; it does not imply a dedicated, fully tested interaction.

| RPC | UI surface | Verification |
| --- | --- | --- |
| `prompt` | Chat / dedicated settings or session control | not-executed |
| `steer` | Advanced console | not-executed |
| `follow_up` | Advanced console | not-executed |
| `remove_queued_message` | Advanced console | not-executed |
| `promote_queued_message` | Advanced console | not-executed |
| `abort` | Chat / dedicated settings or session control | not-executed |
| `abort_and_prompt` | Advanced console | not-executed |
| `abort_and_restore_queue` | Advanced console | not-executed |
| `new_session` | Chat / dedicated settings or session control | not-executed |
| `open_session` | Advanced console | not-executed |
| `negotiate_protocol` | Advanced console | not-executed |
| `get_state` | Chat / dedicated settings or session control | verified |
| `set_fast_mode` | Chat / dedicated settings or session control | not-executed |
| `set_slow_mode` | Chat / dedicated settings or session control | not-executed |
| `goal` | Advanced console | not-executed |
| `set_ask_dialog` | Advanced console | not-executed |
| `get_available_commands` | Chat / dedicated settings or session control | verified |
| `get_entries` | Chat / dedicated settings or session control | not-executed |
| `get_tree` | Chat / dedicated settings or session control | verified |
| `set_todos` | Advanced console | not-executed |
| `set_host_tools` | Advanced console | not-executed |
| `set_host_uri_schemes` | Advanced console | not-executed |
| `set_subagent_subscription` | Advanced console | not-executed |
| `set_event_filter` | Advanced console | not-executed |
| `get_subagents` | Chat / dedicated settings or session control | verified |
| `get_subagent_messages` | Advanced console | not-executed |
| `cancel_subagent` | Chat / dedicated settings or session control | not-executed |
| `steer_subagent` | Advanced console | not-executed |
| `set_model` | Chat / dedicated settings or session control | not-executed |
| `cycle_model` | Chat / dedicated settings or session control | not-executed |
| `get_available_models` | Chat / dedicated settings or session control | verified |
| `set_thinking_level` | Chat / dedicated settings or session control | not-executed |
| `cycle_thinking_level` | Advanced console | not-executed |
| `get_available_thinking_levels` | Chat / dedicated settings or session control | verified |
| `set_steering_mode` | Chat / dedicated settings or session control | not-executed |
| `set_follow_up_mode` | Chat / dedicated settings or session control | not-executed |
| `set_interrupt_mode` | Advanced console | not-executed |
| `compact` | Chat / dedicated settings or session control | not-executed |
| `set_auto_compaction` | Chat / dedicated settings or session control | not-executed |
| `set_cache_warming` | Advanced console | not-executed |
| `set_auto_retry` | Chat / dedicated settings or session control | not-executed |
| `abort_retry` | Advanced console | not-executed |
| `bash` | Advanced console | not-executed |
| `abort_bash` | Advanced console | not-executed |
| `get_session_stats` | Chat / dedicated settings or session control | verified |
| `get_session_lease` | Advanced console | not-executed |
| `export_html` | Chat / dedicated settings or session control | not-executed |
| `switch_session` | Chat / dedicated settings or session control | not-executed |
| `branch` | Advanced console | not-executed |
| `fork` | Chat / dedicated settings or session control | not-executed |
| `navigate_tree` | Chat / dedicated settings or session control | not-executed |
| `abort_branch_summary` | Advanced console | not-executed |
| `set_label` | Advanced console | not-executed |
| `get_branch_messages` | Advanced console | verified |
| `get_last_assistant_text` | Advanced console | verified |
| `set_session_name` | Chat / dedicated settings or session control | not-executed |
| `handoff` | Advanced console | not-executed |
| `get_messages` | Chat / dedicated settings or session control | not-executed |
| `get_messages_page` | Chat / dedicated settings or session control | not-executed |
| `get_login_providers` | Chat / dedicated settings or session control | verified |
| `login` | Chat / dedicated settings or session control | not-executed |
| `get_logout_accounts` | Advanced console | not-executed |
| `logout` | Advanced console | not-executed |
| `predict_word` | Advanced console | not-executed |
| `predict_word_feedback` | Advanced console | not-executed |
| `btw` | Advanced console | not-executed |
| `btw_cancel` | Advanced console | not-executed |
| `get_btw_history` | Advanced console | verified |

## Native and host features

- Native: model roles, presets, fallback chains, thinking, provider endpoints, MCP, skills, plugins, project context, sessions, tasks, and statistics.
- Web host: classifier routing graph, project library, appearance preferences, and persona selection. Personas use a native before_agent_start extension, store their snapshot in session entries, and preserve the original prompt blocks and tool schemas.
- The graph classifies idle-session requests. Queued messages retain the active turn’s model. Classifier calls contribute to native usage.
- File summaries report successful file-tool operations. They do not claim to cover every filesystem change made inside shell commands; absent line totals are labelled “updated”. Checkpoint restoration changes the conversation branch, not files on disk.
- Commands, tools, questions, notifications, status, and text widgets from extensions have web renderers. Custom terminal renderers and terminal-only password login prompts need their own adapter or terminal interaction.
- GitHub uses the project origin and the existing gh login. No repository or login means a setup explanation. Contribution calendars are shown only when the authenticated GitHub query supplies them.
- Native API costs are catalog estimates; subscription billing and unpriced usage are not fabricated.
- The bridge uses the JSONL RPC transport. Binary/audio frame transport has not been implemented or verified.

## Verification performed

Unit tests cover transcript pagination/errors, session selection, graph validation, classifier parsing, persona prompt preservation, provider validation, and provider YAML/credential preservation. Integration checks restored saved conversations, completed a disposable prompt, ran a real classifier, exercised persona injection in OMP, loaded a keyless local provider, created a project, and saved/reloaded project context and host configuration in isolated test files. Mutating RPCs outside those scenarios were not executed as an audit.
