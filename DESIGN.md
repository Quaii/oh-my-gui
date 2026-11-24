# omp. — Design guide

The current interface is a working agent workspace: a quiet navigation rail, an inset conversation
panel, an optional peer editor, and floating controls above a continuous background. Typography,
spacing and material hierarchy do the work. Preserve this composition when fixing bugs or adding the
desktop shell. New decoration is not a substitute for consistency.

This guide records the approved shared web and desktop design. Values below
describe default UI scale; user appearance overrides remain supported. Read the final matching rules
in [index.css](web/src/index.css): the file contains older declarations superseded later in the cascade.
Do not copy an early rule or a third-party component's stock styling as the product specification.

## Project website

The [project website](site/index.html) uses a continuous light-to-dark background with the app’s
Steel tones and dot texture. The top navigation uses a translucent backdrop blur. The project chat
levels on scroll, and the workspace carousel fades to the viewport edges. Its arrows overlay the
active screenshot on hover and keyboard focus, with visible arrows on touch devices.
The theme slices form a display-only gallery. The app’s actual Settings page is visible below, locked
to Appearance, where only the settings content scrolls. Motion respects reduced motion.
The page scrollbar is a thin, trackless thumb that appears when the pointer nears the right edge.

## The material hierarchy

There are three distinct surface roles. Do not turn them into a single universal glass style.

| Role | Current treatment | Where it belongs |
| --- | --- | --- |
| Canvas and navigation | Theme background; sidebar solid by default | App shell, conversation background, navigation |
| Ordinary cards | Solid `--sidebar` by default; optional translucent-card preference | Home, settings groups, appearance choices, usage cards |
| Floating surfaces | Restrained tinted transparency and backdrop blur | Breadcrumbs, toolbar buttons, context cards, response actions, changed files, editor card |

`glass` controls menus/popovers/dialogs and related overlays, defaults **on**. `glassCards` controls
ordinary cards, defaults **off**. `translucentSidebar` defaults **off**. Floating workspace surfaces are
intentional product treatments with their own selectors; they are not all governed by `glassCards`.
Do not make ordinary cards brighter to contrast with the background, or enable glass globally as a fix.

The shared `.workspace-floating-surface` treatment is background mixed at 58% with transparent,
28px backdrop blur and saturation 1.1. It normally has a 12px
radius; the editor card explicitly uses 14px. General menu glass uses its own 24px blur treatment;
tooltips, project dialogs and some controls have explicit overrides. Shared tooltips use a rounded
bubble with a curved tail in the same material. Reuse the owning class for these treatments.

## Color is semantic

[theme.ts](web/src/lib/theme.ts) defines fourteen presets. The dark picker starts with Graphite,
Carbon, Ash and Steel, with Midnight, Forest, Plum and Espresso below. The light presets are Paper,
Linen, Sage, Mist, Rose and Sand. Carbon (`carbon`) is the application default. The selected theme
and validated overrides feed semantic CSS variables through [appearance.ts](web/src/lib/appearance.ts).

| Graphite reference palette | Hex | Semantic use |
| --- | --- | --- |
| Panel | `#111112` | Base workspace background |
| Sidebar | `#1c1c1e` | Navigation and default ordinary-card surfaces |
| Tile | `#232326` | Raised/secondary surface step |
| Border | `#343438` | Subtle boundaries |
| Accent | `#ff5f2e` | Default primary; changes with theme/custom accent |
| Foreground | `#f0f0f3` | Primary text |
| Subtle | `#a3a3ad` | Secondary text |

These are preset inputs, not colors to paste into components. Use `--background`, `--sidebar`,
`--card`, `--border`, `--foreground`, `--muted-foreground` and `--primary`. Ordinary cards explicitly
use `--sidebar` despite the separate `--card` token. User overrides cover accent, background,
foreground, sidebar, chat area, user messages, replies, code blocks and divider color.

Surfaces and controls have no resting one-pixel outlines. Use a surface fill to make boundaries
clear, and reserve lines for meaningful separators and chart guides. Keyboard focus uses a visible
outline or ring. Selection usually changes the surface by one step, with accent text or a small check. Avoid large
accent-colored panels. Task completion and progress follow the active accent, never a fixed orange.
Reserve destructive styling for destructive actions. Verify muted text, dividers, provider marks and
tooltips in light themes as well as dark. The favicon uses the sidebar brand shape and current accent;
the browser title is `omp.`.
Desktop icon tiles center the visible brand bounds on both axes and scale the mark uniformly to
75% of its sidebar geometry. Keep equal opposing padding in both packaged and accent-updated icons;
the mark must not touch the tile edge. Packaged icons use Carbon's accent and background.

## Geometry and type

Conversation history keeps symmetric scrollbar space so opening running-turn controls cannot shift
messages sideways. Return-to-message actions live beside Copy beneath saved messages; do not insert
turn-number or restore-chat dividers between turns. Routine device mount notices stay out of the chat;
warnings, failures and actionable runtime output remain visible.

Geometry starts in [index.css](web/src/index.css). Tailwind spacing utilities and product CSS use
the same 4px unit. Use 2px for tightly joined details and 6px or 10px for compact control spacing.
Measure inner controls from their own panel edge. Screen insets belong to the app frame.

| Spacing role | Default |
| --- | --- |
| Outer app frame and split panes | 8px, with edge-to-edge panes below 768px |
| Toolbar inset and button gap | 12px inset and 8px between buttons |
| Page gutters | 20–36px, based on available viewport width |
| Related controls and cards | 12px |
| Setting rows and compact context cards | 16px |
| Ordinary card padding | 20px, reduced to 16px at narrow widths |
| Major sections and dialog padding | 24px, reduced to 20px at narrow widths |

Let the parent stack own gaps between siblings. Use a padding token inside each surface and a
gap token between surfaces. Tighten responsive density by changing the scoped tokens where the
layout actually needs it.

| Element | Current geometry |
| --- | --- |
| Desktop sidebar | 264px expanded, 64px collapsed; full-height, no floating outer border |
| Main floating panel | Radius follows the shared panel token, default 18px |
| Chat, editor and Settings toolbars | Shared toolbar height, inset and control size |
| Breadcrumb | 36px high with the shared toolbar inset on each side |
| Context cards | Equal 16px padding on every side; 12px stack gap; no shared background behind cards |
| Conversation/composer | Composer frame max-width 752px; maintain the same left and right alignment |
| Settings content | Shared max-width 72rem across pages and search results, with responsive gutters |
| General controls | Shared button/input base height 36px; small controls typically 32px |
| Component radii | 6px compact details, 8px items and tabs, 10px controls, 12px floating surfaces, 14px cards, 18px dialogs, 24px composer |

Use the closest existing radius role for each surface. The user-adjustable panel radius offers
8, 12, 18 and 24px and applies to inset panels and the user message surface. Native window clipping
follows the platform. Pills and dots use full rounding. Keep the same radius through hover, focus,
and inline message editing.

Geist is the default interface font; Geist Mono is the default code/metrics font. Headings inherit
the interface font unless customized. Chat defaults to 14px at line-height 1.7. Toolbar/row text is
usually 13px; metadata is commonly 10–12px. Settings page headings use 24px semibold; Home and the
new-session heading have their own responsive scale. Use weight and spacing for hierarchy, not
all-caps letterspacing. Keep labels vertically aligned with their controls and leave a deliberate gap
between each form label and input.

## Floating controls and scroll edges

Headers are transparent layout layers. Breadcrumb, search, restart and toolbar buttons own their
surfaces. Content scrolls behind them; there is no opaque full-width navigation slab cutting it off.
Use [ToolbarBlur](web/src/components/ToolbarBlur.tsx) and the existing masked gradient. The current
component renders **one** span: its final rule uses 14px blur and a continuous alpha mask; the texture
overlay helps suppress visible banding. Older three-span CSS is not a recipe to reconstruct.

The composer also floats over the transcript. Its blur begins gradually above the input and fades
at the sides; it is bounded to the composer frame, not a screen-wide solid footer. Transcript bottom
padding and scroll padding track the measured composer height so the final message can scroll clear.
Preserve pointer-event routing so the transparent layers do not block reading or clicking content.

Do not put blur fades on every scrollable region. Ordinary editor, explorer, appearance-gallery and
list edges remain clear. [ScrollFrame](web/src/components/ScrollFrame.tsx) is deliberately a neutral
layout wrapper. Scrollbars are thin; shared scroll-area visibility fades without changing layout width.

## Navigation, Home and Settings

Projects are expandable folder rows. Their chats nest below a vertical connector; ordinary chats live
in a separate Chats section. Row hover surfaces keep inset from separators and match neighboring
controls. Project plus actions appear on row hover/focus, and remain available on touch. Collapsed
navigation still exposes chats and theme-aware tooltips. Settings stays at the bottom.

Home is a single-view dashboard showing up to three recent projects, three recent chats, and unfinished
work from saved state. Keep it compact instead of adding a long feed. Home never mounts the Task plan,
GitHub, Session or Agents floating cards. New project uses the same restrained sidebar-colored surface
as other ordinary actions; no decorative multicolor folder illustration.

Settings uses the same sidebar and floating-panel language as chat. Back sits directly below the
sidebar brand, search sits on the left of the floating toolbar, and restart stays on the right.
Restart is a 36px icon control that expands its label on hover/focus. Reset
actions sit immediately **before** the right-aligned control and reveal on row hover/focus. Preserve
discoverable keyboard and touch alternatives. Existing mobile navigation switches to a sheet/compact
section picker; do not force desktop widths into narrow windows. Settings groups are Application,
Models & providers, Agent, Customize the agent, System, and Advanced. System includes installation,
updates, and credits. Advanced opens on demand and contains runtime maintenance, all settings, raw
config and capabilities. It collapses when moving to another Settings page. Advanced groups within
pages also start collapsed. The compact picker exposes Advanced as a submenu.

The workspace sidebar groups chats under Pinned, Projects, and Chats. Its single-line chat rows
show a spinner on the right during a running turn. Hover or focus replaces it with the pin and menu actions.
Drag a chat onto a project or use Move chat from its menu. Project moves organize the sidebar
without changing the runtime's working folder. Pinned chats stay above Projects until unpinned.
The expanded chat list scrolls to the window edge behind the three footer buttons. The buttons
have individual surfaces and enough scroll clearance to reach the last chat above them.
Home uses its own navigation selection and toolbar without the active chat's project or plan usage.
Continue work surfaces running chats first, then saved unfinished tasks and goals. The secondary
column offers project chat shortcuts and recent conversations with previews. Narrow layouts stack
these sections and keep the page scrollable.
Skills installs user-wide Skillshare packages through OMP. Remove offers a confirmation for
registry packages and standalone local skills. Local skill folders move out of discovery intact.

Settings section headers show their names without numeric item-count labels. Space adjacent
sidebar rows with the 4px token and separate groups with the 12px content gap.
Keep navigation icons in the Settings sidebar. Settings rows start with a 15px semibold label
and a short, left-aligned description beneath it. Use icons in cards for actions and status.
Use the shared spacing tokens for page gutters, card padding and rows. Use the section gap between
major groups and the content gap between related cards or a heading and its group. Let the parent
stack own the gap around its notices and cards. Use the shared Settings heading for page and
section titles, with the description directly underneath and actions on the trailing edge.
Settings cards
use the solid sidebar surface in every theme. The workspace card-glass preference applies to Home,
and menus keep their own material. Full-bleed canvas and table cards share the surface and section
spacing while their content defines its own insets.

MCP discovery starts when its settings page opens. Show the source, scope and transport alongside
each selectable server. Keep the runtime inventory distinct from import candidates, and show why
an entry is unavailable before the user tries to import it.

## Conversation and composer

The composer's trailing controls run left to right: context usage, microphone, then Send/Stop.
Context usage and microphone controls share the same hit area.
The chat model picker has an inline visibility mode with individual switches and bulk controls.
It shares its saved visibility preferences with Models settings and preserves the selected model.
The Stop square is centered and fills over half of the icon's canvas.

User messages are compact right-aligned surfaces; assistant replies remain text on the canvas.
Progress updates, tool calls, reasoning, and system notes share one activity disclosure per turn.
Thinking appears below the sent message and expands to show the available reasoning. It becomes
Agent activity when work starts. Completed turns collapse it and leave the final reply and
changed-file summary visible. Tool rows use short labels and keep commands, sources,
and outputs in their details. Adjacent notes and thinking fragments stay grouped. Preserve the
native message indices for restore, branches, and file summaries.
The conversation timeline uses short ticks that extend near the pointer. Hover or keyboard
focus opens a theme-aware preview of the user message and the available reply excerpt.
The hovered or focused tick takes the highlight while the preview is open. Selecting a tick goes to
the original user message. Long timelines scroll within the rail. The Latest control appears only
when the transcript can scroll down.

Normal transcript siblings have 24px separation; continuation rows use 8px and note boundaries 12px.
Avoid combining these margins with another wrapper's vertical padding. Assistant response actions
reserve a row inside the message: the current row has a 36px minimum height and 8px top gap. It must
never overlap the next reminder. User actions remain separate from the inline edit surface. Editing
happens **in the original user bubble**, with clear cancel/save controls, not silently in the composer.

Queued follow-ups sit above the composer in dispatch order. A grip appears on hover or keyboard
focus for reordering. The pencil edits the selected follow-up in the composer while retaining the
ordinary draft. Steer interrupts the current turn and sends the selected message. Stop pauses
automatic delivery until Resume. The Full access permission indicator uses the warning color.

The composer stays at the bottom, including new-session screens. Welcome content aligns to the same
column. Build/Explore/Review use the existing restrained floating tab treatment. Do not restore the
removed Enter/Shift+Enter/slash-command instruction line. Model, thinking, Fast and permission controls
must reflect real capabilities; unsupported controls should not suggest functionality that is absent.

Contextual suggestions sit directly above the composer, only for an eligible registered project with
existing context. They use one borderless, non-wrapping horizontal carousel. Reuse
[HorizontalCarousel](web/src/components/HorizontalCarousel.tsx) for wheel, pointer drag, touch and
keyboard interaction. The start/end 24px fades appear only where more content exists. Do not wrap
long suggestions into a second row or let dragging accidentally submit a prompt.

## Context cards

Each card is independent, relevant to the current chat, and individually dismissible. The stack has
no material behind it. Dismiss controls reveal at their interaction area/focus and remain usable on
touch. Session statistics are available on demand rather than occupying every screen.

- **Task plan:** opens when actual plan data appears; progress stays above the list. Active and pending
  work come first; completed tasks sit behind Show completed with a chevron and count. Preserve full
  usable width, stable scrollbar space and accent-colored completion. No redundant update footer.
- **GitHub:** repository link aligns right in the header without a branch suffix. Branch is a separate
  row. Owner and actual contributors share a draggable horizontal strip, separated when both groups
  exist; do not duplicate the owner in the contributors. No signed-in-user or authentication status
  sentence. Do not substitute the account's personal activity for repository activity.
- **Agents:** show real subagent work and status; no fabricated presence or empty default card.

## The file workspace is a peer panel

The editor shares the workspace background, breadcrumb styling and separate 36px floating toolbar
buttons. The explorer sits directly on the canvas without a vertical divider or another opaque
sidebar slab. Its root picker and search use the shared floating blur treatment.

The code/Markdown viewer lives in a 14px rounded glass rectangle. File-name tabs sit
**above** that rectangle with their own blurred surfaces. Source/Visual is right-aligned in the same
top row for Markdown. Tabs must not disappear into the viewer's header or become a second large bar.
The footer is compact document/save/position status, not an exposed full absolute path.

Both resize handles are visually hidden until hover, keyboard focus or dragging. Keep generous hit
targets even while hidden. Use [panel-layout.ts](web/src/lib/panel-layout.ts): editor minimum is 440px;
the chat minimum is at least 680px and accounts for the composer width. Insufficient space switches to
an overlay instead of crushing the composer. Focus editor hides chat without losing its state.

CodeMirror owns source editing. Markdown Visual mode uses editorcn/Tiptap on the same guarded draft;
unsupported source syntax such as frontmatter/embedded HTML stays Source-only. Navigation, focus,
theme changes and mode changes must preserve drafts, undo and selection. This is part of the visual
experience, not merely a backend detail.

## Icons, backgrounds and the color picker

Workspace icon sets: Lucide, Phosphor, Tabler, Heroicons, Bootstrap and Remix. Use semantic mappings
in [WorkspaceIcons.tsx](web/src/components/WorkspaceIcons.tsx) and adaptive exports in
[NavigationIcons.tsx](web/src/components/NavigationIcons.tsx). Choose meaningfully distinct glyphs for
settings/tools; do not repeat a generic wrench or power icon down an entire page.

Editor icons are independently selectable: Material, Monochrome, Minimal. The shared
[FileIcon](web/src/components/FileIcon.tsx) is used in the explorer, tabs and changed files. Preview
choices accurately; do not recolor provider/company logos as if they were interface glyphs.

Backgrounds are ambient, lazy-loaded and independent of the mouse cursor. None is a valid default
and the fallback for saved selections or theme imports that reference a retired background.
Use local rendered previews, consistent thumbnail geometry and fixed two-line label slots so long
names do not offset neighboring tiles. Background fade, blur and tint opacity are different controls.
Chat and Files share a full-size background clipped to the visible panes.

Respect pause and reduced motion; loading should fit the current background and real skeleton state,
not introduce a new pulsing scene.

The color popover is compact and portrait-oriented: current maximum width 224px, 12px padding,
square saturation field, 14px hue/alpha tracks with 5px corners, and a clean hex/opacity row. It applies
changes live. No Select Color header, Done button, or second filled field inside the hex input.

## Motion preserves the content

Transition-kit is the shared system for fitting navigation, tabs, disclosures and layout changes.
Use [WorkspaceMotion](web/src/components/transitions/WorkspaceMotion.tsx),
[PageTransition](web/src/components/transitions/page-transition.tsx), and
[transitionUpdate](web/src/lib/motion.ts). Route fades currently request 180ms; settings sections 160ms.
Theme fades use 160ms out/220ms in. The shared registry's morph timing defaults to 380ms; do not
misstate that every interaction uses a universal 200ms duration.

Layout snapshots use `tk-morph`, `tk-clip`, **and `tk-text`** to preserve natural text proportions.
Disclosures must clip/reveal rather than stretch words. Keep required flex sizing/min-height classes
on transition wrappers: losing them can move the whole main panel out of view. Avoid competing
transition owners for one interaction. Streaming tokens, typing and live resize dragging remain
immediate. Reduced motion removes snapshot travel; unsupported APIs fall back to usable state changes.

Dropdowns and popovers reveal from their trigger edge and collapse back toward it. The trigger
stays in place. Choice lists match the trigger width and prefer opening below it. Menus below the
composer toolbar would run off-screen, so composer controls prefer opening upward. Menus respect
viewport space and reduced motion.

The Tauri WebView is an explicit exception: frequent desktop state changes and navigation commit
immediately without full-canvas snapshots; sidebar width uses a 160ms CSS transition. This avoids
snapshotting the blurred shader canvas on every interaction. The native window icon follows the
active accent through the local desktop host. Browser transition behavior remains unchanged.

## Review before calling a visual change finished

Inspect the rendered result, not just the JSX or a successful build. Compare the affected surface at
default scale in a dark and light preset, then a custom accent. Check long labels, empty/loading/error
states, collapsed sidebar, narrow editor panes, keyboard focus, touch availability and reduced motion.
Open and close disclosures repeatedly. Scroll the first and last message past both floating controls.
Confirm equal padding, legible materials, no toolbar overlap, natural text proportions, and retained
editor drafts after Home/Settings navigation. Capture meaningful evidence without committing personal
chat screenshots. Change this guide only for an intentional design decision, not to bless a regression.

## Windows custom title bar

The Windows desktop host disables native decorations and uses the existing floating panel toolbar
for minimize, maximize/restore and close. The three 36px buttons sit flush on one rounded toolbar
surface. Each button has its own hover and focus state, with a red hover on Close. The group lives
on the rightmost visible workspace/editor panel and in the Settings toolbar.
Workspace toolbar slots animate width, spacing and opacity during the Files handoff.
Standalone chats show only the session title. Project chats show their folder breadcrumb and a
Leave project action.
Plan usage sits beside the project breadcrumb or session title. The toolbar shows the five-hour
allowance when the selected provider has one connected account and reports that window. The popover
lists connected accounts across providers, with five-hour windows first and other reported windows
below. Accounts without limits show an explicit empty state. Keep subscription limits independent
of the Settings usage history and label an unavailable refresh.
Settings → Models controls which models the chat picker lists. Visibility is saved on the device
and leaves the active model, native availability and role assignments intact.
Custom provider editing can remove individual manual model registrations. Removing a provider
requires confirmation and also removes its registrations from the OMP catalog.

Free header space supports native dragging and double-click maximize/restore; buttons, fields,
menus and workspace cards keep their normal interaction. Maximize state follows native resize events.
Browser and non-Windows chrome are unchanged. Window actions remain authenticated and allowlisted.
The Windows app and installer use a 12 DIP rounded window region, applied before showing and
refreshed on resize or display-DPI changes. The workspace, Settings and setup panels use the same
12 DIP radius, compensated for content zoom. This overrides the panel-radius preference in Windows
custom chrome; browser and other platform panels retain their existing radius settings.
Maximized/fullscreen windows clear the region to fill the display. The tray retains native DWM
rounding. The Windows app and installer disable the native shadow so no second frame extends
beyond the custom region. The region follows client-area bounds, excluding hidden resize borders.
The native light border is suppressed to match the dark custom chrome.

## Desktop installation and setup

The custom installer and first-launch setup are a compact workspace: a left progress rail and one
floating content panel, with 12px outer padding and gap. The Windows setup window is 680×460,
with no separate caption strip or large canvas around a centered card. Its panel has 14px corners
outside Windows custom chrome, where it follows the 12 DIP native frame radius described above,
and 24px horizontal padding; the top-right X is the only close control. Once installation starts,
closing asks for confirmation. If the installation engine is already writing, Finish and exit waits
for that operation to finish safely without opening setup. Never kill NSIS mid-write. The brand/header
area provides window dragging, including its label. A transparent 24px grab area spans the top edge
without adding a title bar or covering the close control. First-run setup uses the same compact window without a caption strip,
then expands into the workspace. The themed view commits before the hidden native window is revealed.
The installer always uses Carbon and has no theme selector. Carbon is also the application default
for new profiles; explicit saved themes are retained. Completed steps use accent checkmarks in the
left rail, the active step uses the sidebar selection surface, and future steps remain muted.
Runtime checks, installation errors and retry controls remain visible; no download percentages are fabricated.
Theme previews use a three-column grid inside a bounded scroll area; the page must never grow wider
than its window. Appearance choices update immediately. Provider connection remains an explicit action
in the existing Settings screen.

## Native workflow surfaces

Project creation/opening uses frosted menu glass, with a Browse action beside its path.
Desktop Browse opens a parented native folder chooser; the web host provides explicit directory
navigation and Select this folder. Cancellation preserves the path and never creates a project.
Project, provider and update dialogs share the established blurred material. Do not replace it with
opaque fills or translucent black as a workaround for a rendering defect. Keep standard
`backdrop-filter` in source and let the CSS build add vendor prefixes: explicit WebKit declarations
after the standard declaration cause the current optimizer to drop the standard property. Verify
production CSS and rendered text behind the surface, not just the source declaration.

On Windows and macOS the tray opens a 272 × 288 logical-pixel themed React panel anchored near its
icon. It starts with running sessions and up to three recent chats. Settings sits directly above Quit
in the footer. Escape or focus loss dismisses the panel, and Quit opens the main-window confirmation.
The panel has no header and never mounts a second workspace or agent bridge. Linux retains its native
indicator menu because its tray protocol does not deliver the click events needed for a custom popup.

Settings → Updates & changelog shows the application version separately from the OMP runtime,
with bundled release notes and explicit loading/error states. About also shows the app version.
Available signed releases use a small floating notice with View update and Remind me tomorrow;
postponement lasts 24 hours for that version and survives restart. Update details use a frosted dialog,
readable release notes, actual download progress and a separate Install and restart action after
signature verification. Unsaved/saving editor documents and active work block installation. An
unconfigured release channel is visibly unavailable, never presented as “up to date.”

The custom Windows installer marks single-line steps on a dot rail. System checks, Verify package,
OMP runtime, Windows checks, Install files and Final checks lead to Open setup on a fresh install
or Open omp. when replacing an existing copy. The installer labels updates and reinstalls separately.
For equal version strings, the installed build fingerprint distinguishes an update from a reinstall.
Its overall bar counts completed stages;
package-check progress uses bytes actually read. Native dependency and copy operations remain active
without fabricated byte percentages. Keep the stage detail and bar visible in the compact window.
Successful installation requires installed-file, Node runtime and uninstall-registration checks.

Native desktop close requests, including taskbar close actions, open a quit confirmation. Show the
reported running-session count and warn about unsaved editor changes. Cancel preserves the window;
Keep in tray hides it without stopping runtimes. Selecting a live chat reuses its runtime identity. The tray mark
follows the accent. Installers keep their separate abort-installation confirmation and have no tray.

Settings pages have independent error recovery so a failed panel does not remove navigation. The
app-level fallback offers Retry and Reload. Skill discovery has a bounded wait and visible errors.
Skill rows show their source badge and reveal an Open folder action beside it on hover or focus.
The skill count sits above the filters, aligned to their right edge. Card actions and switches
are vertically centered beside their text, including when the description wraps.
On touch screens the action stays visible. Loading skeletons derive IDs from metadata keys and
tolerate supplemental entries.

Installation owns launch configuration. Desktop setup opens on first launch. About & credits
places the app version on the right of the Credits heading. Provider authentication belongs only to Providers. Routine
Session settings describe the current conversation. Expert diagnostics and runtime maintenance are
secondary Advanced surfaces. Task completion is agent-owned; settings do not offer manual phase
removal or completion toggles. Models show the default first, with workload overrides in a closed
Advanced disclosure. Custom-provider configuration uses the same frosted menu glass as Appearance,
with no horizontal overflow.

Provider cards use the rightmost slot for the sign-in button or signed-in status. Both share the
same corner radius. Hover or keyboard focus reveals account management to its left. Touch screens
keep the action visible.
Custom providers prefer the favicon declared by their public website.
Accounts expand inside their card. Keep browser launch and manual sign-in completion in the same
dialog when the runtime requests a callback.

Advanced session goals, branch/label controls, execution settings and side-question topics
use ordinary settings groups with the same sidebar material and spacing. Native operation forms use
that material too; command help supplies real argument/action choices rather than a JSON-only workflow.
Log bodies load when their disclosure opens, append native output deltas and retain a bounded tail.
Closing a disclosure stops its polling. Process exit is the completion signal.

Native questions remain focused modal dialogs. Preserve the selected initial option, descriptions,
checkbox round-trips, structured free-text answers, protected inputs and deadlines. Native cancellation
removes the matching dialog. Composer text supplied by an extension has an Undo backup; widgets retain
their above/below-editor placement. A native terminal handoff stays visibly distinct from a GUI operation.

Voice is a compact icon control in the existing composer row. Dictation updates only its originating
draft and never sends a prompt automatically. Native completion appears as a muted suffix, accepted with
Tab; it does not animate the surrounding input. While a turn is active, the composer keeps the draft
editable and offers Stop. Sending resumes when the turn ends. Goal/task status and subagent activity
always come from native results/events.
Personas are opt-in at new-chat launch. Import Markdown into the persona library, then choose a
saved persona for one conversation. OMP stores its prompt snapshot with that conversation and
continues to discover user and project rules independently.
Web search results use the site's favicon when available and keep the letter badge when a site
has no usable icon.
In Usage, multi-day trends group activity by local calendar day. Trend lines share the donut's
model palette. Each band starts with its line color and fades to transparent across its own height.
Cost by model and the donut
breakdown show up to four rows before scrolling, using the same scrollbar as Settings navigation.
Chart headings and tabs start at the card inset. Cards in a two-column row share a height.
The donut omits zero-usage models and rounds both ends of each slice. Corner radius and spacing shrink
with narrow slices so they retain their proportions.
The usage note has its own card. Published-price checks compare OMP's estimate with current
public token rates and identify models without a comparable rate.

Extensions show suggested marketplaces, configured sources, browsable plugins and installed
extensions. Adding a catalog and installing a plugin are explicit actions. Show install scope
when the native marketplace install can target a registered project.

Desktop workspace cards enter with a 220ms fade and 6px rise and exit in 140ms. Reduced motion removes travel and duration. Streaming updates do not replay this entrance; browser cards retain transition-kit.

The file split animates through one clipped width and opacity transition. Dirty-close guards run before exit. Drag resizing and reduced motion are immediate.
