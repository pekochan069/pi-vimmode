## Why

Architecture review found several source-of-truth splits where runtime behavior, diagnostics, docs drift metadata, and visual-selection semantics are repeated across modules. This change tightens those seams with behavior-preserving refactors before the duplication becomes harder to validate.

## What Changes

- Add narrow internal keymap grammar helpers for binding enumeration and exact/prefix conflict checks so runtime compilation and settings diagnostics share one rule source.
- Make customization diagnostics derive prompt transform action descriptions and IDs from `src/prompt-transform-actions.ts` rather than duplicating registry facts.
- Co-locate runtime help docs/spec/test drift anchors with the runtime help registry and keep docs drift checks reading registry-backed metadata.
- Extract visual-selection semantics into a focused pure module used by modal, render, range, and buffer callers while preserving current visual behavior.
- Keep the unused workbench seam deferred; do not delete or redesign it in this change.

### Non-goals

- No new Vim/Neovim behavior, Vimscript, recursive mappings, timeout mappings, or public plugin API.
- No generated docs tables for prompt transform actions.
- No broad docs-drift metadata migration beyond runtime help registry anchors.
- No user-facing change to visual Ex range prefill; `'<,'>` remains the line-oriented marker behavior.
- No new runtime dependencies.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-keymap-configuration`: shared internal grammar helpers must keep runtime command resolution and settings conflict diagnostics equivalent.
- `prompt-transform-action-keybindings`: customization diagnostics must use canonical prompt transform action registry metadata.
- `runtime-help-drift-guard`: runtime help drift anchors must be registry-owned and validated from one source.
- `vim-editor-adapter-architecture`: visual-selection semantics must move behind a focused pure seam without changing prompt editing behavior.

## Impact

- Affected code seams: `src/commands.ts`, `src/config.ts`, `src/keymap-descriptors.ts`, `src/prompt-transform-actions.ts`, `src/customization.ts`, `src/runtime-help.ts`, `src/buffer.ts`, `src/modal/visual.ts`, `src/range.ts`, `src/modal/ex-command-line.ts`.
- Affected tests: keymap command/config equivalence tests, customization diagnostics tests, docs drift tests, visual/range/buffer/modal tests.
- Affected docs/specs: OpenSpec deltas only unless implementation reveals stale user-facing docs; no generated docs tables planned.
- API/dependencies: no public runtime API change, no breaking changes, no new dependencies.
