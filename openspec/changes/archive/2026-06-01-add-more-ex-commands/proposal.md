## Why

Ex command-line mode currently supports only literal substitution, so common Vim-fluent line commands still fall back to normal-mode key sequences or unsupported-command errors. Adding a finite set of prompt-buffer Ex commands closes the next high-leverage gap without expanding into full Vimscript.

## What Changes

- Add non-substitution Ex commands for prompt-buffer line operations: `:delete`/`:d`, `:yank`/`:y`, `:put`/`:pu`, `:copy`/`:t`, `:move`/`:m`, and `:join`/`:j`.
- Add `:nohlsearch`/`:noh` to clear visible prompt search highlights from Ex command-line mode.
- Reuse existing Ex range semantics for addressed line ranges and add destination line parsing where copy/move need a target.
- Keep scope finite: no regex substitution, global Ex commands, shell/file commands, command history, semicolon ranges, range offsets, confirmation flags, or Vimscript evaluation.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `vim-ex-command-line`: support a finite set of non-substitution Ex commands over the prompt buffer, including line edit commands, destination-address commands, and search-highlight clearing.

## Impact

- Affected code: `src/ex.ts`, `src/modal/engine.ts`, `src/buffer.ts`, `src/modal/types.ts`, and focused tests in `test/ex.test.ts`, `test/buffer.test.ts`, and `test/vim-editor.test.ts`.
- Affected docs: `docs/features.md`, `README.md`, and `TODOS.md` limitations/completion notes.
- No new runtime dependencies or configuration surfaces.
