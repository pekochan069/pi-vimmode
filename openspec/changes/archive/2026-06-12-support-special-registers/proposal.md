## Why

pi-vimmode already supports unnamed and alphabetic edit registers, but common Vim clipboard and discard workflows still fail because every non-letter register target is rejected. Supporting a small, practical special-register subset removes a frequent Vim muscle-memory gap without expanding into full Vim/Neovim register parity.

## What Changes

- Add supported special register targets after `"` in normal, visual, visual-line, visual-block, and supported Ex line-command register operands.
- Support explicit unnamed register `""` as an alias for current unprefixed unnamed-register behavior.
- Support black-hole register `"_` for yank/delete/change writes that intentionally discard captured text and leave the unnamed register unchanged; paste from `"_` is a safe no-op.
- Support clipboard registers `"+` and `"*` for copying yank/delete/change text to the host clipboard through Pi clipboard support and reading current host clipboard text for normal-mode paste with prompt-local typed mirrors as fallback.
- Preserve existing named register `a-z` replace and `A-Z` append behavior.
- Keep unsupported special registers safe and explicit, with readable feedback where command surfaces already report register errors.
- Add docs, runtime help, inspect output, and validation for supported and unsupported special-register behavior.

Non-goals:

- Full Vim/Neovim register parity.
- Vimscript expression register evaluation (`"=`), numbered delete history (`"1`-`"9`), yank register `"0`, small-delete register `"-`, read-only filename/command/search registers, or persistent registers.
- Full Vim typed clipboard metadata for arbitrary OS clipboard text; host clipboard reads paste as charwise text.
- New runtime dependencies.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `vim-named-registers`: extend register prefix semantics from alphabetic named registers to selected prompt-local special registers, including explicit unnamed, black-hole, clipboard write targets, and normal-mode clipboard paste.

## Impact

- Affected code: `src/modal/registers.ts`, `src/modal/types.ts`, `src/modal/engine.ts`, `src/modal/normal.ts`, `src/modal/visual.ts`, `src/modal/ex-command-line.ts`, `src/modal/inspect.ts`, `src/vim-editor.ts`, `src/clipboard.ts`, and `src/ex.ts` for special-register parsing, state, modal effects, and adapter-owned clipboard writes/reads.
- Affected tests: register helper tests, normal/visual modal tests, Ex parser and execution tests, adapter effect tests, inspect tests, and docs drift tests.
- Affected docs: `docs/features.md`, runtime help/register quick reference, and spec docs for supported special registers plus limitations.
- Dependencies/API: no new runtime dependencies expected; adapter may import existing Pi clipboard helper if available. No breaking changes to existing named or unnamed register behavior.
