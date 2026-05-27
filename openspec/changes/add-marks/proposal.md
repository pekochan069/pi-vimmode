## Why

`TODOS.md` tracks marks as a remaining Vim-parity gap. Prompt editing already has modal state, cursor restoration, visual selections, and pure buffer helpers, so local marks can be added without changing Pi core or widening adapter responsibilities.

## What Changes

- Add Vim-style local mark setting with `m{slot}` for lowercase `a-z` slots.
- Add mark jumps with backtick + `{slot}` for exact cursor positions and single-quote + `{slot}` for the marked line's first non-blank character.
- Allow mark jumps from normal mode and visual modes; normal jumps move the cursor, visual jumps extend the active selection.
- Support mark jumps as operator motions for delete, change, and yank where practical, using exact jumps as characterwise ranges and line jumps as linewise ranges.
- Keep marks prompt/editor-session local, in memory only, with safe no-ops for missing or invalid marks.
- Clamp stored mark positions to the current prompt when text changed after mark creation; full Vim mark-adjustment semantics are out of scope.
- Document supported mark syntax, limitations, validation, and remove the marks TODO only after implementation passes.

## Capabilities

### New Capabilities

- `vim-marks`: Local Vim-style mark setting, mark jumps, visual/operator mark motion behavior, safe invalid handling, documentation, and validation.

### Modified Capabilities

- None

## Impact

- Affected code: `src/types.ts`, `src/commands.ts`, `src/modal/*`, `src/buffer.ts`, and `src/vim-editor.ts` for mark state, dispatch, cursor restoration, and test accessors.
- Affected tests: command parsing tests, modal state/effect tests, buffer range tests, Vim editor integration tests, and visual-mode tests.
- Affected docs: README normal-mode keymap, limitations, validation notes, and `TODOS.md` after implementation is complete.
- No dependency, Pi core, or public package API changes expected.
