## Why

Vim users expect `>` and `<` to shift prompt lines without dropping into Ex command-line. pi-vimmode already has `:indent` and `:dedent`, so normal and visual shift bindings can reuse that behavior while keeping scope practical and prompt-local.

## What Changes

- Add normal-mode line shift bindings:
  - `>>` indents the current line.
  - `<<` dedents the current line.
  - Counts such as `3>>` and `2<<` shift that many lines starting at the cursor line.
- Add visual-mode shift bindings:
  - `>` indents all selected lines in visual char, visual line, and visual block modes.
  - `<` dedents all selected lines in visual char, visual line, and visual block modes.
- Reuse existing prompt transform semantics:
  - indent adds two spaces to each addressed line.
  - dedent removes at most one tab, two spaces, or one leading space from each addressed line.
- Preserve safe finite behavior for unsupported shift combinations.

### Non-goals

- No full Vim shiftwidth/softtabstop configuration.
- No arbitrary `>{motion}` or `<{motion}` range support in this change.
- No recursive mappings, Vimscript, or full Vim/Neovim parity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `extended-vim-keybindings`: Add normal and visual line-shift keybindings for prompt-local indent and dedent.
- `vim-keymap-configuration`: Expose shift operators through semantic keymap configuration while keeping them line-only.

## Impact

- Code seams: `src/types.ts`, `src/config.ts`, `src/commands.ts`, `src/modal/engine.ts`, and existing prompt transform helpers in `src/buffer.ts`.
- Tests: add focused parser/modal/buffer behavior coverage for normal counted shifts, visual shifts, unsupported combinations, dot-repeat, and existing operator behavior.
- Docs: update `docs/features.md` and `docs/settings.md` if keymap settings expose the new operators/bindings.
- Dependencies: no new runtime or peer dependencies.
- Compatibility: no breaking changes; existing `d`, `c`, `y`, motion, visual, and Ex behavior must remain unchanged.
