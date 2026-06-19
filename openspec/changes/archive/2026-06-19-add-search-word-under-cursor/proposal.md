## Why

Prompt search already supports `/`, `?`, `n`, and `N`, but users still must type a query to search for the word at the cursor. Vim users expect `*` and `#` to turn the current word into the repeat-search query, which speeds prompt editing without expanding into full Vim search grammar.

## What Changes

- Add normal-mode `*` to search forward for the keyword word under the cursor, including an insertion cursor at a word end.
- Add normal-mode `#` to search backward for the keyword word under the cursor, including an insertion cursor at a word end.
- Reuse existing prompt search repeat state so `n` repeats the chosen `*`/`#` direction and `N` searches the opposite direction.
- Reuse existing literal search matching, wrapping, history, and highlight behavior where applicable.
- Expose `*` and `#` as finite semantic keymap command defaults so users can remap them like other supported commands.
- Update tests, feature docs, settings docs, and `TODOS.md` after validation.

## Non-goals

- No full Vim search grammar, smartcase, `iskeyword` setting, search offsets, or regex generation from the cursor word.
- No language-aware symbol search or cross-prompt search.
- No operator-motion or visual-mode support for `*`/`#` unless implementation finds an already-safe existing seam.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-search`: add word-under-cursor prompt search commands and repeat-state behavior.
- `vim-keymap-configuration`: expose word-under-cursor search as finite configurable command actions with default `*` and `#` bindings.

## Impact

- Affected seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/commands.ts`, `src/buffer.ts`, `src/modal/search.ts`, `src/modal/engine.ts`, and focused modal/config tests.
- Docs: update `docs/features.md` and `docs/settings.md` for `*`/`#` behavior and bindings.
- Project tracking: mark the `TODOS.md` second item complete after tests pass.
- Dependencies: no new runtime or peer dependencies.
- Compatibility: no breaking changes; insert-mode `*`/`#` remain delegated to Pi default editing.
