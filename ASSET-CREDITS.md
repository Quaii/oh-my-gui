# Asset and component credits

- OMP configuration enum choices: native definitions from [oh-my-pi v18.20.0](https://github.com/can1357/oh-my-pi/tree/v18.20.0/packages/coding-agent/src), including provider tiers, voices and task effort. `server/data/settings-enums.json` records the pinned version; the metadata generator merges them only for that version.

- Rare UI official registry: https://github.com/swamimalode07/rare-ui/tree/main/public/r . Attribution is available in Settings → About & credits. Registry source components preserve their original design; adaptations connect controlled values and OMP data.
- User-provided shadcn.io manual source for Canvas, Attachment, Artifact, and Agent. Button/Tooltip/Accordion calls are adapted from Base UI to the installed shadcn Radix primitives where necessary. Reasoning, Terminal, and Checkpoint are usage patterns, adapted from the supplied examples.
- Transitions.dev free library patterns P14 (Skeleton Reveal) and P16 (Sliding Tabs): https://transitions.dev/library.html . Source attribution also appears in component comments.
- Shader Gradient: https://www.23rd.dev/ . Source is vendored in `web/src/components/ui/shader-gradient.tsx`.
- Material Icon Theme: https://github.com/material-extensions/vscode-material-icon-theme/tree/main/icons . Distributed license is in `web/public/file-icons/LICENSE`.
- Lobe Icons: https://github.com/lobehub/lobe-icons (MIT). Cached provider marks and verified company favicons are recorded in `web/public/provider-icons/sources.json`; the license is in `web/public/provider-icons/LOBE-LICENSE`. Custom providers use the favicon declared by their public website where available, with a built-in mark or generic icon as a fallback.
- Lucide: https://lucide.dev/ . Phosphor: https://phosphoricons.com/ . Company marks remain the property of their owners.
- Unslop by Damir Sokolovsky: https://github.com/heydamir/unslop (CC BY 4.0). Used for the spacing, color, icons, copy, typography, layout, details, visuals, and motion review. The skill is installed at `~/.codex/skills/unslop`.

- React Bits: https://reactbits.dev/ and https://github.com/DavidHDev/react-bits . The included backgrounds use official TypeScript/CSS registry sources. MIT with Commons Clause; full license in `web/src/components/backgrounds/react-bits/LICENSE.md`. This application adapts ambient props and removes global pointer tracking. Thumbnails in `web/public/backgrounds/react-bits` and `web/public/backgrounds/23rd` are captures of the installed renderers using the local `/background-preview` route; no website screenshots or branding. Shape Waves and Aero Shards require WebGPU; unsupported browsers receive the captured static poster.

- Additional user-supplied shadcn.io manual sources: Trace, Marker, Commit, Message Branch, Package Info, and Web Preview are installed in `web/src/components/ui`. Suggestion, Chain of Thought, Chat, Checkpoint, Confirmation, File Tree, Inline Citation, Stack Trace, Terminal, Test Results, and Tool are composition patterns built from those parts, shadcn primitives, and the retained Rare UI response/code/search components. Adaptations cover the existing Radix Collapsible/Tooltip/Button APIs, native OMP branch/tool data, and sandboxed previews. No demonstration responses or fabricated results are shown.

- CodeMirror 6 powers the optional floating file editor. MIT licensed; upstream: https://github.com/codemirror. Language packages and Lezer highlighting retain their installed licenses.

- Tabler Icons (MIT), Heroicons (MIT), and Remix Icon (Apache 2.0) are included through React Icons: https://github.com/react-icons/react-icons . Upstreams: https://github.com/tabler/tabler-icons , https://github.com/tailwindlabs/heroicons , https://github.com/Remix-Design/RemixIcon . Each workspace choice uses its actual glyphs for navigation and previews.
- File extension icons use 47 locally bundled Material Icon Theme SVGs; the pinned upstream revision and asset names are recorded in `web/public/file-icons/sources.json`. Filename associations include package managers, TypeScript configuration, Git files, README, environment files, and licenses. No VS Code extension executes in the app.

- editorcn by shadcn-labs (MIT): https://github.com/shadcn-labs/editorcn . The optional Markdown visual editor uses the official npm UI and Tiptap Markdown extensions.
- transition-kit: https://transition-kit.space/ . Source/Visual tabs and their UI transition core/CSS come from the official shadcn registry, with local theme styling. React 19.3 is already installed. The existing twelve-theme system and route transitions are preserved.

- Global transition-kit adoption uses the official page-transition core, page fade CSS, tabs and UI transition helpers. Disclosure/layout/list adapters retain the existing Radix APIs; the theme adapter supports the workspace's twelve themes. Official reference: https://transition-kit.space/llms.txt . CSS and source headers retain attribution.

- Bootstrap Icons (MIT), included through React Icons: https://github.com/twbs/icons . Material and monochrome editor icon modes share the locally bundled Material Icon Theme assets; Minimal uses Lucide file-category outlines.

- Tauri updater plugin (Apache-2.0 OR MIT): https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/updater . Used by the native host for signed update verification and platform upgrade handoff; no plugin webview permissions are granted.

- Tauri dialog plugin (Apache-2.0 OR MIT): https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/dialog . Native project-folder selection is called only by the host, with no filesystem/dialog IPC permissions granted to the webview.

- smol-toml (BSD-3-Clause): https://github.com/squirrelchat/smol-toml . The server uses it to read Codex configuration. Desktop bundles include its license.
