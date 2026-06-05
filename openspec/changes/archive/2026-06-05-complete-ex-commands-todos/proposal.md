## Why

`TODOS.md` Ex section now mixes shipped-but-unchecked work with real missing Ex behavior. Completing this change reconciles source-of-truth drift and finishes the remaining prompt-local Ex UX without expanding into full Vimscript or full Vim/Neovim parity.

## What Changes

- Reconcile stale Ex TODOs and docs for already-shipped behavior: regex substitution via `r`, range offsets, semicolon ranges, and Ex history.
- Add practical remaining substitution behavior: repeat-substitution commands and finite prompt-safe flags such as count-only and no-error-on-no-match, while keeping confirmation/print/magic/backreference semantics out of scope.
- Add Ex register operands for `:delete`, `:yank`, and `:put`, including lowercase named-register reads/writes and uppercase append semantics where applicable.
- Improve Ex command-line editing through a bounded command-line editing helper that supports cursor-aware edits and history without embedding arbitrary prompt-buffer editing in Ex input.
- Add configurable workbench/Ex row reservation so users can keep command feedback space visible and avoid prompt viewport jumps.
- Extract oversized modal command handlers behind focused helpers before adding more Ex branches.
- Update `TODOS.md`, `docs/features.md`, and `docs/settings.md` so user-facing behavior, limitations, and settings match source behavior.

### Non-goals

- Full Vimscript, `:global`, file/shell/window/buffer commands, recursive mappings, `.vimrc`, Neovim Lua, or arbitrary Ex command dispatch.
- Vim regex replacement expansion such as `&`, `$1`, or `\1`; replacements remain literal unless a future change proposes otherwise.
- Interactive substitution confirmation (`c`) or print-listing flags (`p`, `#`, `l`) in this change; these need a different multi-row/message design.
- Replacing the main Pi prompt editor or making Ex command-line mode a second full prompt editor.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-ex-command-line`: add repeat substitution, finite substitution flags, richer bounded command-line editing, and revised finite line-command grammar for register operands.
- `vim-named-registers`: extend named-register read/write/append semantics to supported Ex line commands.
- `vim-ui-configuration`: add configurable workbench row reservation and document how reserved rows affect prompt viewport height.

## Impact

- Affected code seams: `src/ex.ts`, `src/range.ts` only if grammar touch is needed, `src/buffer.ts`, `src/modal/ex-command-line.ts`, `src/modal/engine.ts`, `src/modal/registers.ts`, `src/config.ts`, `src/types.ts`, `src/vim-editor.ts`, and render/status helpers as needed.
- Tests: parser tests, range/ex command tests, modal integration tests, register tests, config tests, render/width-safety tests, and documentation drift validation.
- Docs: `TODOS.md`, `docs/features.md`, `docs/settings.md`, and runtime help metadata if feature summaries change.
- Dependencies: no new runtime or peer dependencies.
- Compatibility: no breaking changes; existing Ex commands, histories, registers, and UI defaults continue to work.
