# Agent skills

Project skills for agents contributing to omp. Each directory contains a SKILL.md with a specific trigger and workflow. Read [AGENTS.md](../../AGENTS.md) first; [DESIGN.md](../../DESIGN.md) owns visual rules and values.

| Skill | Use it for |
| --- | --- |
| [omp-ui-polish](omp-ui-polish/SKILL.md) | Spacing, materials, icons and responsive polish |
| [omp-motion-review](omp-motion-review/SKILL.md) | Transition distortion, scroll fades and input/animation boundaries |
| [omp-runtime](omp-runtime/SKILL.md) | RPC/SSE, chat state, transcript grouping and native capabilities |
| [omp-editor](omp-editor/SKILL.md) | File roots, source/Visual drafts, guarded saves and split layout |

## How the files work together

AGENTS.md is the short project entry point. CLAUDE.md imports it. DESIGN.md records the current interface. A skill adds task-specific working guidance and points back to those guides instead of copying their values.

This directory contains the canonical skill bodies. The matching .claude/skills directories contain thin discovery entries with the same name/description and a relative link back here. This mirrors the reference project's single-source arrangement without requiring Windows symlink privileges. Keep the adapters thin; never maintain a second workflow there. Run npm run docs:check after changes.

Load only the skills relevant to the request. These files describe how to contribute; they do not authorize model requests, edits to live user files, publication, or unrelated integrations.

## Structure reference and provenance

The compact root guide, CLAUDE.md import and canonical skill collection follow the organization of [skopevoj/spoti.pw](https://github.com/skopevoj/spoti.pw), specifically its AGENTS.md, CLAUDE.md and .agents/skills/README.md. The workflows here are written for this React/Node project. No iOS implementation rules or upstream skill bodies were copied. Keep upstream asset/component credits in [ASSET-CREDITS.md](../../ASSET-CREDITS.md).
