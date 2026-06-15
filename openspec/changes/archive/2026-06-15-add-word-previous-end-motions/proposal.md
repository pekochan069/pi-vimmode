## Why

pi-vimmode supports core word motions (`w`, `b`, `e`), and the current helpers already behave close to whitespace-delimited tokens. Vim-fluent prompt editing still lacks the explicit uppercase WORD key vocabulary and backward word-end corrections (`ge`/`gE`) users expect to compose with counts, visual mode, and operators.

## What Changes

- Add explicit whitespace-delimited WORD motions:
  - `W` moves to the start of the next WORD.
  - `B` moves to the start of the previous WORD.
  - `E` moves to the end of the current or next WORD.
- Preserve current lowercase `w`, `b`, and `e` semantics; this change does not retune lowercase word boundaries.
- Add previous-end word motions:
  - `ge` moves to the end of the previous word using existing word boundaries.
  - `gE` moves to the end of the previous WORD using whitespace-delimited boundaries.
- Support counts for all new motions, including after motion-capable operators.
- Allow `d`, `c`, and `y` to target the new motions through the resolved operator-motion matrix.
- Expose the new motion actions through semantic keymap configuration and documentation.
- Preserve safe prompt-local no-op behavior when a target does not exist.

### Non-goals

- No full Vim/Neovim word-class parity beyond explicit word and WORD behavior in this change.
- No subword, camelCase, snake_case, or language-aware token motion.
- No cross-prompt navigation, global jumplist, recursive mappings, Vimscript, or `.vimrc` support.
- No viewport/display-line motions such as `gj`/`gk` in this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `extended-vim-keybindings`: Add WORD and previous-end motions in normal, visual, and operator-motion contexts.
- `vim-keymap-configuration`: Expose the new finite motion actions through semantic motion bindings and the operator-motion matrix.
- `prompt-buffer-operations`: Add pure navigation/operator range support for WORD and previous-end word targets.
- `pi-vimmode-documentation`: Document the new motions, examples, configurable action names, and explicit limitations.

## Impact

- Code seams: `src/types.ts`, `src/config.ts`, `src/commands.ts`, `src/buffer.ts`, `src/modal/normal.ts`, and any modal/view helpers that enumerate supported motions.
- Tests: add focused buffer navigation tests, parser/keymap tests, modal normal/visual motion tests, operator-motion tests, invalid-target no-op tests, and config validation tests.
- Docs: update `docs/features.md` and `docs/settings.md`; keep README as quickstart/index only unless an index link needs adjustment.
- Dependencies: no new runtime or peer dependencies.
- Compatibility: no breaking changes intended; existing `w`, `b`, `e`, operators, counts, visual modes, marks, search, macros, and Pi shortcut delegation must continue to work.
