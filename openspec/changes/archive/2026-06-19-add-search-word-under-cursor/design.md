## Context

`vim-search` already owns prompt-local literal and bounded-regex search through `/`, `?`, `n`, and `N`. Successful searches update `lastSearch`, in-memory search history, and optional visible highlights; failed searches are safe no-ops. The command parser already resolves finite semantic command bindings from `src/keymap-descriptors.ts` through a compiled keymap cache, and modal search behavior is isolated in `src/modal/search.ts`.

The TODO item adds Vim-like `*` / `#` search for the current word. This should be a small extension of the existing search seam, not a new workbench or Vim grammar expansion.

## Goals / Non-Goals

**Goals:**

- Add normal-mode `*` and `#` commands that search for the keyword word under the prompt cursor.
- Preserve existing repeat semantics: `n` repeats the direction recorded by `*` or `#`; `N` reverses it.
- Reuse literal prompt search matching, wrapping, search history, and highlight side effects.
- Keep command bindings configurable through the existing finite semantic keymap system.
- Keep insert-mode `*` / `#` delegated to Pi default editing.

**Non-Goals:**

- No full Vim `iskeyword`, smartcase, search offsets, magic modes, or regex query generation.
- No language-aware symbol extraction.
- No cross-prompt search or persistent history.
- No operator-motion or visual-mode `*` / `#` behavior for this change.

## Decisions

### Decision 1: Add semantic command actions for word search

Target seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/commands.ts`, `src/modal/engine.ts`, `docs/settings.md`.

Add two `VimCommandAction` values, e.g. `searchWordForward` and `searchWordBackward`, with default bindings `*` and `#`. Let `resolveNormalCommand()` return normal command results through the existing compiled keymap cache.

Alternatives considered:

- Special-case raw `*` / `#` in `src/modal/engine.ts`. Rejected because it bypasses remapping, keymap diagnostics, and duplicate-binding precedence.
- Model `*` / `#` as pending `/word<Enter>`. Rejected because no input row is needed and query collection side effects would be misleading.

### Decision 2: Keep word extraction pure and keyword-only

Target seam: `src/buffer.ts`.

Add a pure helper that returns the keyword run containing the cursor. Keyword characters reuse the existing small-word classifier shape: ASCII letters, digits, and `_`. Because the prompt cursor is an insertion point, a cursor immediately after a keyword run (including end of line) resolves to that preceding word. Cursor on whitespace or punctuation with no keyword char under/behind it returns no target.

Alternatives considered:

- Scan forward/backward to the nearest word from whitespace. Rejected because it turns `*` on blank space into surprising movement and exceeds “word under cursor”.
- Support punctuation WORDs. Rejected because the TODO asks word search; `W`/`B` style WORD behavior can be proposed separately if needed.
- Make keyword characters configurable. Rejected as premature; full `iskeyword` compatibility is a non-goal.

### Decision 3: Reuse search completion side effects without opening pending search

Target seam: `src/modal/search.ts`.

Add a search helper that accepts an already-resolved literal query and direction, then performs the same successful-search side effects as completed `/` / `?`: find wrapped match from current cursor, update `lastSearch` with matcher mode `literal`, append search history, update visible highlight when configured, restore cursor, and invalidate. No match or no query leaves prompt text, cursor, registers, marks, Ex messages, visual state, and previous search state unchanged.

Alternatives considered:

- Duplicate search logic in `applyCommand()`. Rejected because repeat state, history, highlight, and wrapping rules already live in `src/modal/search.ts`.
- Record regex mode for `*` / `#`. Rejected because word search should be literal and finite.

### Decision 4: Normal-mode only for first pass

Target seam: `src/modal/engine.ts`.

Route `searchWordForward` / `searchWordBackward` only through normal-mode command handling. Visual and operator contexts keep current behavior: unsupported mappings no-op through existing parser/modal paths unless a future proposal defines ranges and selection semantics.

Alternatives considered:

- Extend visual selections with `*` / `#`. Rejected because Vim behavior and prompt UX are less obvious, while `/` and `?` already cover visual search motions.
- Allow `d*` / `y#` operator motions. Rejected because this needs an explicit range contract and is not requested.

### Decision 5: Treat keymap docs and validation as source-of-truth work

Target seams: `docs/features.md`, `docs/settings.md`, config/parser/modal tests, and `TODOS.md`.

Document `*` / `#` beside prompt search, list command setting paths beside other keymap commands, and mark the TODO item complete only after tests and OpenSpec validation pass. Because this uses existing command-keymap option families, no new settings object or `VimEditor` cloneOptions branch is expected; still add focused tests that configured bindings execute and invalid/conflicting bindings fall back safely.

Alternatives considered:

- Rely only on feature docs. Rejected because the commands are settings-visible and docs drift guards expect settings docs to track supported keymap actions.

## Risks / Trade-offs

- Word boundary ambiguity at insertion-point cursors → Define “under cursor” as keyword char under cursor or keyword run immediately before cursor.
- Duplicate search side effects drift from `/` / `?` → Centralize resolved-query search in `src/modal/search.ts` and test `lastSearch`, history, highlight, cursor, and no-op behavior.
- Keymap precedence regression → Use existing command descriptors and compiled command lookup; add parser/config tests for default and configured bindings.
- Overclaiming Vim parity → Docs list literal keyword-only behavior and non-goals.
- TODO completion without proof → Update `TODOS.md` only after validation commands pass.

## Migration Plan

1. Add tests for default `*` / `#` search behavior, no-word no-op, insertion-point word end, repeat semantics, highlights/history, and insert-mode delegation.
2. Add command action types and descriptor defaults.
3. Add pure buffer helper for keyword word extraction.
4. Add modal search helper for resolved literal word search and wire normal-mode commands.
5. Add keymap configuration tests and docs updates.
6. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`; then mark `TODOS.md` item complete.

Rollback strategy: revert the change. No persistent data, dependency, or migration state changes.

## Open Questions

None. Counts for `2*` / `2#`, visual mode, operator motions, and configurable keyword characters stay out of scope unless requested later.
