## Why

`TODOs.md` calls out common Ex commands; `:q` is the smallest useful gap because Vim users expect it to leave the editor/session from command-line mode. This should add Pi-specific quit support without drifting into full file/window Vim parity.

## What Changes

- Add finite Ex quit commands `:q` and `:quit` that request Pi shutdown through the extension context.
- Preserve prompt text and modal editing state while handing shutdown to Pi; no prompt-buffer edit, register write, search mutation, macro mutation, or dot-repeat update.
- Document the explored command surface and intentionally defer file/window/shell commands that do not fit prompt-local Pi editing.
- Update tests and docs for supported quit commands and rejected near-misses.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-ex-command-line`: Adds finite Pi quit commands and documents which common Ex commands remain out of scope.

## Impact

- Code seams: `src/ex.ts`, `src/modal/ex-command-line.ts`, `src/modal/types.ts`, `src/vim-editor.ts`, and `src/lifecycle.ts` for parser, modal effect, adapter handling, and `ExtensionContext.shutdown` wiring.
- Tests: parser tests plus modal/VimEditor adapter tests proving `:q`/`:quit` request shutdown and preserve editor side effects.
- Docs: `docs/features.md` and runtime help/diagnostic surfaces as needed.
- Dependencies: no new runtime dependencies or peer dependency changes.
- Compatibility: no breaking changes; unsupported Ex commands still fail explicitly.

## Non-goals

- No full Vimscript, `:write`, `:wq`, `:q!`, `:qa`, shell commands, file buffers, windows, tabs, or arbitrary command abbreviations.
- No direct `process.exit`; Pi owns graceful shutdown.
