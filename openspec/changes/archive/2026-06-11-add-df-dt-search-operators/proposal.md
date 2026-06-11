## Why

Line-local character search already supports `f`, `F`, `t`, and `T` as motions, but operators cannot use those same targets. Users expect prompt edits like `df)`, `dt,`, `cf:`, and `yt]` to work as finite Vim-style operator targets without leaving prompt-local semantics.

## What Changes

- Allow delete, change, and yank operators to target line-local character search commands (`f`, `F`, `t`, `T`) after the operator.
- Preserve normal-mode character search behavior and last-character-search repeat state when operator character search succeeds.
- Support counts for operator character search targets, e.g. `d2f,` deletes through the second later comma on the current line.
- Keep missing targets safe: clear pending operator, leave text/cursor/registers/mode unchanged, and do not insert unmatched keys.
- Document supported combinations and limitations in feature/settings docs.
- Add focused parser, buffer, modal, and configuration tests.

### Non-goals

- No full Vim grammar or recursive mappings.
- No cross-line `f`/`t` search; character search remains current-line only.
- No new runtime dependencies.
- No change to Pi-owned insert-mode shortcuts or slash-command behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `extended-vim-keybindings`: line-local character search becomes a supported operator target for delete, change, and yank.
- `vim-keymap-configuration`: configured semantic character-search command bindings work after supported operators using the same finite keymap parser.
- `prompt-buffer-operations`: prompt buffer exposes operation-level range/edit helpers for operator character-search targets so modal code does not compose low-level offsets.

## Impact

- Affected code seams: `src/commands.ts` finite key parser, `src/buffer.ts` prompt-buffer operation helpers, `src/modal/normal.ts` operator application/repeat state, and possibly `src/modal/engine.ts` dispatch routing only.
- Tests: add or extend `test/commands.test.ts`, `test/buffer.test.ts`, and modal/editor tests covering `df`, `dt`, `cf`, `yt`, counts, configured keymaps, missing target no-ops, registers, and mode transitions.
- Docs: update `docs/features.md` and `docs/settings.md`; update runtime help/drift tests if keybinding docs are generated or asserted.
- Compatibility: additive, no breaking changes, no dependency changes.
