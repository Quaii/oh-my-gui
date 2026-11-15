---
name: omp-editor
description: Fix the omp. file explorer, split panels, source/Markdown editing, drafts or saves. Use for editor behavior and its shared workspace presentation.
---

# Preserve the document while changing the editor

Read the editor sections of [DESIGN.md](../../../DESIGN.md), then FileWorkspace.tsx, components/files, lib/editor-session.ts, lib/panel-layout.ts and server/src/editor.ts as relevant.

## One draft, guarded saves

Source editing is CodeMirror. Markdown Visual mode loads editorcn/Tiptap on the same file draft and Save path. Keep the source editor mounted through mode changes; do not reserialize merely because Visual was opened. Preserve source-only syntax such as frontmatter and embedded HTML by keeping it in Source mode.

Drafts, selection and undo survive tab switches, another chat, Home, Settings and Focus editor. Unsaved text stays in memory rather than browser storage. Closing dirty tabs/panels offers the existing keep/discard/save choice. Saving during another edit must not replace the newer draft with the earlier saved snapshot.

## Scope and presentation

- Filesystem operations stay behind the local API. Preserve allowed roots, real-path/symlink checks, UTF-8/size constraints and version conflict checks. A path reported by a failed tool is not a new permitted root.
- The explorer is transparent with a separator; the editor card owns the glass. File tabs sit above it; Source/Visual aligns right on that row. Root picker and search share the floating material.
- Use the common FileIcon component and independently persisted editor icon preference across the tree, tabs and changed files.
- Both resize grips remain keyboard/pointer operable while visually hidden until hover/focus/drag. Clamp through panel-layout.ts and use the overlay when the chat controls cannot fit. Focus changes visibility, not document identity.

## Verify

Exercise two independent dirty tabs, undo, mode switching, navigating away/back, close cancellation and a conflicting external file update as relevant. Use temporary fixtures for disk writes. Check a narrow pane and both light/dark themes for visual changes. Run the editor/state/Markdown tests appropriate to the change and the production build for UI changes. Do not save a user's live file just to prove the Save button works.
