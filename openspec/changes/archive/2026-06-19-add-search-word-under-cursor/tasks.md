## 1. Pure Buffer Helper

- [x] 1.1 Add focused `test/buffer.test.ts` coverage for keyword word extraction on cursor-inside-word, cursor-at-word-end, line-end, punctuation, whitespace, underscore, and digit cases.
- [x] 1.2 Add a pure `src/buffer.ts` helper that returns the literal keyword word under the prompt cursor or immediately before an insertion-point cursor.
- [x] 1.3 Keep helper internals private except for the operation-level export needed by modal search.

## 2. Parser, Types, and Keymap Configuration

- [x] 2.1 Add `searchWordForward` and `searchWordBackward` to `VimCommandAction` and default command descriptors with `*` and `#` bindings.
- [x] 2.2 Add `test/commands.test.ts` and descriptor coverage for default and configured word-search command resolution through the compiled keymap path.
- [x] 2.3 Add config tests for valid remaps, invalid binding fallback, sibling-field preservation, and protected shortcut rejection where applicable.
- [x] 2.4 Add or update live `VimEditor` option propagation tests so configured word-search bindings survive editor construction.

## 3. Modal Search Integration

- [x] 3.1 Add modal tests for normal-mode `*` forward search, `#` backward search, wrapped matches, insertion-point word-end extraction, and missing-word no-op behavior.
- [x] 3.2 Add modal tests that successful `*` / `#` update `lastSearch`, search history, and search highlights without changing prompt text.
- [x] 3.3 Add modal tests that `n` and `N` repeat correctly after `*` and after `#`.
- [x] 3.4 Add modal tests that insert-mode `*` / `#` are delegated to Pi default editing and do not enter modal search handling.
- [x] 3.5 Add a resolved literal word-search helper in `src/modal/search.ts` that reuses existing match, history, highlight, and cursor-restore behavior.
- [x] 3.6 Wire `searchWordForward` and `searchWordBackward` in normal-mode command handling without adding visual or operator-motion behavior.

## 4. Documentation and Tracking

- [x] 4.1 Update `docs/features.md` prompt search docs with `*`, `#`, keyword-only query extraction, repeat behavior, and limitations.
- [x] 4.2 Update `docs/settings.md` command keymap table with `piVimMode.keymap.commands.searchWordForward` and `searchWordBackward` defaults and delegation notes.
- [x] 4.3 Update runtime help or docs-drift metadata if docs validation requires new anchors or command references.
- [x] 4.4 Mark the `TODOS.md` `*` / `#` search word under cursor item complete after validation passes.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate --specs --strict`.
- [x] 5.6 Run `openspec validate add-search-word-under-cursor --strict`.
- [x] 5.7 Run `graphify update .` after code/doc changes.
