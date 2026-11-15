# Asset and component credits

- Rare UI official registry: https://github.com/swamimalode07/rare-ui/tree/main/public/r . Attribution is available in Settings → About & credits. Registry source components preserve their original design; adaptations connect controlled values and OMP data.
- User-provided shadcn.io manual source for Canvas, Attachment, Artifact, and Agent. Button/Tooltip/Accordion calls are adapted from Base UI to the installed shadcn Radix primitives where necessary. Reasoning, Terminal, and Checkpoint are usage patterns, adapted from the supplied examples.
- Transitions.dev free library patterns P14 (Skeleton Reveal) and P16 (Sliding Tabs): https://transitions.dev/library.html . Source attribution also appears in component comments.
- Shader Gradient: https://www.23rd.dev/ . Source is vendored in `web/src/components/ui/shader-gradient.tsx`.
- Material Icon Theme: https://github.com/material-extensions/vscode-material-icon-theme/tree/main/icons . Distributed license is in `web/public/file-icons/LICENSE`.
- Lobe Icons: https://github.com/lobehub/lobe-icons (MIT). Cached provider marks and verified company favicons are recorded in `web/public/provider-icons/sources.json`; the license is in `web/public/provider-icons/LOBE-LICENSE`. Unknown providers use their configured endpoint favicon, then an accessible globe fallback.
- Lucide: https://lucide.dev/ . Phosphor: https://phosphoricons.com/ . Company marks remain the property of their owners.
- Unslop by Damir Sokolovsky: https://github.com/heydamir/unslop (CC BY 4.0). Used for the spacing, color, icons, copy, typography, layout, details, visuals, and motion review. The skill is installed at `~/.codex/skills/unslop`.

- React Bits: https://reactbits.dev/ and https://github.com/DavidHDev/react-bits . All 63 backgrounds from the supplied list use official TypeScript/CSS registry sources. MIT with Commons Clause; full license in `web/src/components/backgrounds/react-bits/LICENSE.md`. This application adapts ambient props and removes global pointer tracking. Thumbnails in `web/public/backgrounds/react-bits` and `web/public/backgrounds/23rd` are captures of the installed renderers using the local `/background-preview` route; no website screenshots or branding. Shape Waves and Aero Shards require WebGPU; unsupported browsers receive the captured static poster.

- Additional user-supplied shadcn.io manual sources: Trace, Marker, Commit, Message Branch, Package Info, and Web Preview are installed in `web/src/components/ui`. Suggestion, Chain of Thought, Chat, Checkpoint, Confirmation, File Tree, Inline Citation, Stack Trace, Terminal, Test Results, and Tool are composition patterns built from those parts, shadcn primitives, and the retained Rare UI response/code/search components. Adaptations cover the existing Radix Collapsible/Tooltip/Button APIs, native OMP branch/tool data, and sandboxed previews. No demonstration responses or fabricated results are shown.

- CodeMirror 6 powers the optional floating file editor. MIT licensed; upstream: https://github.com/codemirror. Language packages and Lezer highlighting retain their installed licenses.
