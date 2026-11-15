# OMP interface review

Applied [Unslop](https://github.com/heydamir/unslop), created by Damir Sokolovsky, licensed CC BY 4.0. Installed the requested skill from its repository. Preserved the selected third-party components, navigation sidebar, and inset floating main panel as requested.

## Direction

OMP is a workbench for coding, inspecting agent activity, and configuring its runtime. The direction is calm, precise, and tactile, drawing from desktop editors. Routing and usage carry the richer visuals. The inset floating panel remains the signature layout.

## Nine passes

| Pass | Findings and changes |
| --- | --- |
| Spacing | Standardized settings rows and toolbar heights. Fixed the project tabs' orientation-specific height overriding their container. Full-width project action; existing folders require only their path. |
| Color | Neutral switch tracks with accent thumbs; neutral segmented selections. Twelve coordinated light/dark presets, eight backgrounds, and nine independently adjustable surface/text colors. Higher contrast option. |
| Icons | Every settings navigation item and native field has an icon. Added previews of both workspace icon families. Provider marks are cached locally. Library credits moved to About & credits. |
| Copy | Removed debug success messages and configuration keys from tool rows. Labeled theme controls by the surface they affect. Existing folder names are inferred. |
| Typography | Configurable UI, code, and heading fonts; chat text size and line height. Font choices use the existing Geist family or system fonts. |
| Layout | Same sidebar and rounded main panel for workspace and Settings, with an icon rail when collapsed. Appearance is a list grouped into colors, typography, surfaces, icons, and images. Fixed native color-input swatch clipping. |
| Details | Rounded, padded segmented options. Context and Send remain separate. Context opens a usage breakdown. Command palette's opaque inner background removed. Menus use a 64% theme-colored surface over a real 24 px backdrop blur. The main panel stays opaque, with shaders inside it. Chart tooltips use readable semantic colors and labels; bar hover has no full-row fill. |
| Visuals | Kept Rare UI previews and the actual 23rd shader component. Added icon previews and expanded theme/background choices. Presets and custom overrides share semantic tokens, including light/dark mode. |
| Motion | Kept short route/reveal transitions and reduced-motion behavior. Loading uses request state, never an artificial timer. Native setting placeholders derive groups and control types from OMP metadata; skills, tools, models, runtime, providers, extensions, and personas have distinct shapes. Hidden content no longer determines the placeholder height. |

## Verification

- TypeScript check and production build pass.
- Eleven automated checks pass, including appearance import validation and backwards compatibility.
- Real OMP chat send, saved-session restoration, routing/persona injection, keyless local-provider discovery, project creation/reopening, and project-rule writes were tested during this implementation.
- Browser checks covered theme application, icon switching, collapsed Settings navigation, Send/context layout at mobile width, expandable reasoning, existing-project form, and actual command-palette translucency/backdrop filter.
- Checked sidebar edges in both widths, Home's scroll reset, and the empty chat's equal content/scroll heights. Chat auto-scroll no longer moves Home. Hidden skeletons are clipped to avoid invisible overflow.

Runtime coverage and remaining native terminal-only limitations are documented separately in [CAPABILITIES.md](CAPABILITIES.md). Usage costs are API equivalents, not provider bills. The browser uses supported backdrop filters; with a uniform background there is naturally less detail to blur.

## Completed follow-up polish

Preserved the selected component sources and sidebar/inset-panel structure. Unified toolbar typography and surfaces; resets reveal on row hover/focus before the right-aligned controls. Cards match the sidebar by default; glass cards remain opt-in. Added continuous masked header/composer blur and subtle background dithering, compact square live color picker, ambient-only full React Bits catalog with locally rendered previews, semantic Memory icons, animated navigation width, and project/chat hierarchy. Rebuilt Home around three recent projects/chats and actual unfinished work. Usage uses native read-only stats for stacked model trends, a model donut, compact rounded cost bars, active session timing and calendar-day streaks. Grouped adjacent streaming thought blocks while preserving tool/reply boundaries; status follows the current native stream phase. Added responsive controls, expanding Restart action, and accent-aware favicon.

Latest validation: 23 focused tests pass, including native partial snapshots/tool identity, automatic canonical to-do state, request-level activity grouping with native indices preserved, and capability-gated Fast mode. Browser checks used the real saved 10-item/7-done test conversation: plan auto-open, unfinished tasks first, independent dismissal, project exit via global New chat, equal welcome/composer width, accent-aware favicon, 198px square picker field, equal 36px header controls with 13px panel-edge insets, and consistent background-label row heights.

Additional supplied patterns: actual Trace/Marker/Commit/MessageBranch/PackageInfo/WebPreview source installed; suggestion buttons send selected prompts, attachments use native images, file summaries expand as folders, native sibling replies preserve versions, and structured tool presentation uses only reported commit/package/test/error data. Read-only GitHub activity supports the existing Git credential helper without returning credentials to the browser. Validation now includes 27 passing tests and the production build.

Latest follow-ups: Home does not mount contextual cards or their toolbar action. Completed tasks fold behind Show completed, with the scrollbar confined below the progress area. Contextual `@smol` suggestions sit directly above the composer and reuse unchanged context. Permission defaults use OMP's actual four approval modes. Changed files open a peer floating CodeMirror panel; filenames, read/write behavior, UTF-8/line endings and stale-save rejection are backed by real files. User messages edit in place with Cancel/Send, and action buttons keep an 8px outer / 6px inner radius with arrow-free tooltips. Standalone sessions show Workspace and start in the home directory. Validation includes 33 focused tests plus type checking and the production build; browser checks used the user's existing C++ file without saving changes or running another model prompt.
