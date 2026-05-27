## Why

Visual mode currently supports characterwise and linewise selection, but not blockwise selection. Vim users expect `Ctrl-v` / visual block semantics for editing aligned text, code snippets, and tabular prompts without leaving the prompt editor.

## What Changes

- Add visual block mode as a third visual selection kind alongside characterwise and linewise modes.
- Support entering visual block mode from normal mode with `Ctrl-v` and switching to it from other visual modes.
- Render rectangular block selections across multiple prompt lines while preserving cursor visibility and terminal width safety.
- Apply `y`, `d`, and `c` to block selections with predictable rectangular text/register behavior.
- Document visual block keymap and behavior.
- Add tests for selection math, rendering, register contents, delete/change behavior, and mode transitions.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `vim-mode-visual-configuration`: Add blockwise visual selection requirements, rendering, operations, documentation, and validation.

## Impact

- Affected code: `src/types.ts`, `src/buffer.ts`, `src/commands.ts`, `src/render.ts`, `src/vim-editor.ts`, `src/modal/*` as needed.
- Affected specs: `openspec/specs/vim-mode-visual-configuration/spec.md`.
- Affected tests: buffer selection/operation tests, render tests, command handling tests.
- Affected docs: README visual mode/keymap section.
- No dependency or public API package changes expected.
