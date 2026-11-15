# OMP Web Frontend

React interface for the local OMP harness, using `omp --mode rpc` over JSONL and SSE.

Contributors: start with [AGENTS.md](AGENTS.md), the current [design guide](DESIGN.md), and the
[project skills](.agents/skills/README.md). `CLAUDE.md` imports the same root instructions.
Run `npm run docs:check` to validate local documentation links and skill discovery entries.

```sh
npm install
npm run dev        # API :4317, frontend :5317
# or
npm run build
npm start          # UI and API :4317
```

`OMP_BIN` selects the runtime. On Windows the server also checks `%LOCALAPPDATA%\omp\omp.exe`, then PATH. `PI_CODING_AGENT_DIR` defaults to `~/.omp/agent`; `PORT` and `HOST` select the local server address. `OMP_API_TARGET` can point Vite at a separate development API.

The server runs locally with the user's filesystem and OMP access. Keep it bound to loopback unless you add authentication and review the exposure.

## Interface

Chat and Settings share the same sidebar geometry and floating main panel. Page changes use a short transition-kit fade, with reduced-motion support. Settings stays at the bottom of expanded and collapsed navigation. Task plans, GitHub projects, and active subagents appear as independent, dismissible floating cards under the toolbar when relevant. Workspace cards opens session statistics on demand. Sidebar New chat starts a workspace chat; each project has its own New chat action, and the breadcrumb offers Leave project. Context usage appears beside Send. Connection failures use one centered recovery panel.

Settings and conversation loading use shadcn Skeleton shapes and Transitions.dev's reveal treatment, driven by actual request state. Empty/error states appear after the request settles. Conversation rows have ellipsis and thin scrollbars. Floating header and composer controls sit over continuous blur fades. Native tool iterations share one supplied Trace-based Agent activity disclosure per request; thinking blocks merge, and the final answer stays outside it. Fast mode requires an advertised priority tier and a provider route that realizes it; Rare UI response/status/search components use native stream and tool data.

Home is a single-view dashboard with the last three projects and chats, plus unfinished saved to-dos, goals, and live workflows. Registered project chats nest under their folder; ordinary chats remain in Chats. Create a folder or open an existing project. GitHub cards use the origin remote and an existing GitHub CLI or Git Credential Manager login. Credentials remain on the server and are sent only to GitHub’s API.

## Components and provenance

| Source | Used for |
| --- | --- |
| shadcn/ui | Buttons, inputs, switches, dialogs, sheets, menus, popovers, scroll areas, skeletons, command pickers |
| [Rare UI](https://www.rareui.com/components) | Proximity Sidebar, Rail TOC, Task List, Theme Selector, Prompt Box, Streaming Response, AI Status, Grid Reveal, Web Search, Code Block, FAQ, GitHub Activity, Folder |
| User-supplied shadcn.io examples | Canvas, Attachment, Artifact, Agent; Reasoning, Terminal, and Checkpoint patterns adapted to the existing primitives |
| [23rd](https://www.23rd.dev/) | Actual Shader Gradient source; seven shader backgrounds, pause/reduced motion |
| [React Bits](https://reactbits.dev/) | All 63 supplied backgrounds, lazy loaded individually; local rendered thumbnails, ambient motion without cursor tracking |
| [Transitions.dev](https://transitions.dev/library.html) | Free P14 Skeleton Reveal and P16 Sliding Tabs, adapted to real loading and controlled state |
| [Material Icon Theme](https://github.com/material-extensions/vscode-material-icon-theme) | File-type SVGs; license in `web/public/file-icons/LICENSE` |
| Lucide / Phosphor | Selectable navigation icons |

Rare UI attribution is available in Settings → About & credits. ObsidianUI and Oxygen were design references; their components have not been represented as installed. Provider icons use locally cached Lobe Icons company marks and verified company favicons; see [asset credits](ASSET-CREDITS.md).

## OMP management

- Runtime version, executable/config paths, credentials' signed-in state, live sessions, task limits, and message counts.
- Native settings catalog, model roles, thinking selectors, fallback settings, custom/local API providers, MCP, skills with filters, prompts/project rules, extensions and marketplace actions.
- Usage totals from `omp stats --json`, supplemented by read-only queries to the native stats database for per-model hourly trends, peak tokens, active session duration, and timezone-aware streaks. Stacked trends, a model donut, compact cost bars, and API-equivalent cost disclosure.
- Host classifier routing: editable nodes/connections, model and thinking controls, test classification, saved configuration. Disabled until explicitly enabled.
- Opt-in persona library: prepend or append instructions, optionally remove the exact OMP identity sentence, retain project rules and tool schemas, persist the chosen persona with the session.
- Advanced RPC console and an honest runtime capability check. See [CAPABILITIES.md](CAPABILITIES.md) for coverage and limitations.

Host configuration is saved as `web-control.json` in the OMP agent directory. Native provider configuration stays in `models.yml`/`models.yaml`. File writes preserve unrelated configuration and make backups. Appearance includes twelve presets, 70 backgrounds plus None, six workspace icon sets and three independent editor icon styles, nine color overrides, contrast, UI/code/heading fonts, chat text size and line height, corner radius, shadows, background fade/blur/tint, independent menu and card glass, and sidebar translucency. Cards default to the solid sidebar color. The compact live color picker supports hex and tint opacity. The favicon follows the current accent. Version 2 theme exports include the selected background and animation preference. The tab is named `omp.`. Older exports gain safe defaults. Preferences and image data stay in browser storage.

## Validation

```sh
npm run typecheck
npm test
node scripts/check-chat.mjs --send
node scripts/check-local-provider.mjs
node scripts/check-routing-persona.mjs
node scripts/check-management-writes.mjs
```

The supplied shadcn.io patterns also cover prompt suggestions, attachment chips, expandable changed-file folders, commit cards, package changes, reported test counts, error stacks, source-link previews, and local web previews. Reply regeneration uses OMP’s native tree; saved sibling versions can be compared and explicitly continued. Preview pages open only after a click in a sandboxed frame. Console capture from arbitrary dev servers is not implemented.

The chat and routing/persona checks expect a running API on :4318 and use an already configured model; they make disposable test requests. The write checks use isolated temporary files and project folders. `OMP_TEST_URL` overrides the chat check's API address.

The backend is in `server/src`, the React UI in `web/src`, and shared host configuration types in `shared/control.ts`. There is no second agent runtime: native actions are forwarded to OMP, while features implemented by the web host are explicitly identified in the UI and audit.

## Latest workspace refinements

Home never mounts the floating Task plan, GitHub, Session, or Agents cards. They are available only inside chats. Task plans show unfinished work first, with completed tasks behind Show completed. Project suggestions appear immediately above the composer only when a registered project already has context. OMP's low-cost `@smol` role generates them without tools; unchanged context is cached for 30 minutes. Web sources use the installed Rare UI WebSearch component.

The composer includes native approval defaults: Ask before changes, Ask and remember, Allow edits, and Full access. This changes OMP's global default, shared with terminal sessions; project, tool, restricted-folder and launch policies can still override it. The UI reports explicit approval launch flags instead of pretending to change them. Existing permissions are never changed merely by loading the UI.

Changed-file names open a second floating file browser and CodeMirror editor. UTF-8 text files up to 2 MB are supported, with syntax highlighting, undo, search, Ctrl/Cmd+S, and an explicit Save action. Version checks reject stale saves. The browser is scoped to the chat's working folder and folders of successful native file operations; it resolves real paths before access. Inline message editing preserves the original branch via OMP's native tree. Standalone chats use the home folder by default (`OMP_WORKSPACE_CWD` can override it); project labels only appear for registered projects.

## Finished file workspace

Open Files is available from the chat toolbar, command palette, and Ctrl/Cmd+Shift+E. The browser lazily expands folders, filters the selected root folder, switches between permitted roots, and paginates large directories with Show more. The file panel and tree have pointer and keyboard resize handles. Multiple file tabs retain their edits, selection and undo history; drafts stay in memory when Home, Settings, or another chat hides that workspace. No unsaved source content is persisted to browser storage. Dirty tab/panel closure offers Keep editing, Discard, or Save and close. Files changed externally fail the save with a conflict instead of overwriting the new version. The code editor responds to theme changes and displays a line/column position. Ordinary editor and list edges remain clear; blur fades are reserved for content passing behind floating controls.

[Recent requests audit](RECENT-REQUESTS-AUDIT.md) records the last ten feature requests, their implementation evidence, and remaining native/runtime limits. The permission selector remains OMP's global default, not a per-chat override.

The editor shares the workspace background and floating breadcrumb toolbar. Focus editor hides the chat without closing its draft or file tabs; Show chat restores the split. The resize grip preserves enough chat width for the composer controls, using an overlay when the window cannot fit both panes. Workspace icons offer Lucide, Phosphor, Tabler, Heroicons, Bootstrap, and Remix with live previews. Editor icons independently offer Material, Monochrome, and Minimal across the explorer, tabs, and changed files.

Markdown files offer Source and Visual editing modes. Visual mode loads editorcn on demand, shares the current file draft and guarded Save action, and serializes Markdown through Tiptap. Merely opening Visual mode does not modify the file. Frontmatter and embedded HTML stay in Source mode to preserve source-only syntax. Standard headings, formatting, links, lists, tasks, images, tables, and fenced code are supported. Switching modes keeps the source editor mounted and its undo history. Source/Visual controls use transition-kit tabs with reduced-motion support.

Transition-kit is the shared motion system for workspace/settings routes, settings sections, tabs, expandable sections, sidebar widths and filtered chat rows, editor tab/focus layout, and workspace cards. Theme switching uses a native View Transition adapter with the kit's fade treatment so all twelve themes remain available. Motion changes start only for deliberate interface updates; token streaming and resize dragging stay immediate. Reduced motion disables travel, and unsupported browsers keep normal state updates. Existing shadcn/Radix behavior, focus handling, and native OMP data remain in place.
