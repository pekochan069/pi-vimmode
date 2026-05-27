## Why

`TODOS.md` tracks registers as a remaining Vim-parity gap. Prompt editing already has an unnamed register, modal engine state, and buffer-level register operations, so named edit registers can be added without changing Pi core or expanding adapter responsibilities.

## What Changes

- Add Vim-style named edit register prefixes with `"{slot}` for supported yank, delete, change, and paste commands.
- Support lowercase named registers `a-z` and uppercase append aliases `A-Z` for yank/delete/change into the matching lowercase register.
- Keep the unnamed register updated by every yank/delete/change, including operations that target a named register.
- Paste from named registers with `"{slot}p` and `"{slot}P`, preserving existing characterwise and linewise paste semantics.
- Keep named registers in memory for the editor session only; no system clipboard, numbered registers, expression registers, or persistence.
- Preserve macro storage separation from edit registers so `q{slot}` macro slots do not collide with `"{slot}` edit registers.
- Add parser, modal-engine, buffer integration, adapter/integration, README, and TODO coverage for named register behavior.

## Capabilities

### New Capabilities

- `vim-named-registers`: Vim-style named edit register selection, append behavior, paste behavior, macro separation, documentation, and validation.

### Modified Capabilities

- None

## Impact

- Affected code: `src/types.ts`, `src/commands.ts`, `src/modal/*`, `src/buffer.ts` if register helper types need widening, and `src/vim-editor.ts` for integration helpers/testing access.
- Affected tests: command parsing tests, modal state/effect tests, buffer register tests, Vim editor integration tests, and documentation validation where applicable.
- Affected docs: README normal-mode keymap, registers/undo section, limitations, and `TODOS.md` after implementation is complete.
- No dependency, Pi core, or public package API changes expected.
