## Context

The Vim extension owns modal prompt editing through `src/modal/*`, command parsing in `src/commands.ts`, buffer transforms in `src/buffer.ts`, and Pi adapter effects in `src/vim-editor.ts`. `TODOS.md` still lists `/` search as unsupported. Insert-mode slash behavior must remain delegated to Pi so Pi slash-command completion keeps working; this change only handles `/` while Vim normal/visual/operator-pending mode is active.

Search needs small cross-module state: active search input while collecting a query, last search query/direction for `n` and `N`, and a way to move or select to the next match in the prompt buffer.

## Goals / Non-Goals

**Goals:**
- Support normal-mode `/` query entry and forward search across the current prompt buffer.
- Support `n` and `N` repeat search using the last completed query and direction.
- Keep search no-op safe for empty queries, cancelled search, and missing matches.
- Reuse pure buffer helpers for match lookup and motion/range calculation so behavior is unit-testable.
- Integrate search movement with visual mode selection and operator-pending ranges where existing modal architecture permits.
- Preserve Pi insert-mode slash-command/autocomplete behavior.

**Non-Goals:**
- Regex search, incremental highlighting, search history UI, `?` backward search, `*`/`#`, or global search across prior prompts.
- Persisting search state across sessions.
- Changing Pi core editor APIs or terminal rendering internals.
- Full Vim edge-case parity for offsets, magic modes, or command-line editing.

## Decisions

1. **Represent search as modal state, not Pi prompt text.**
   - Add `pendingSearch` state for query collection and `lastSearch` state for repeat navigation.
   - Rationale: normal-mode `/` is command input, not literal prompt insertion. Keeping it in modal state avoids corrupting prompt text.
   - Alternative considered: delegate `/` to Pi and inspect typed characters. Rejected because Pi insert semantics and slash-command completion are unrelated to normal-mode search.

2. **Model completed search as a motion-like target.**
   - Add buffer helpers that find next/previous query match from a cursor and return a `Position` plus optional addressed range.
   - Rationale: normal movement, visual extension, and operator-pending actions can share one tested primitive.
   - Alternative considered: implement search directly in `VimEditor`. Rejected because search math belongs with buffer operations and should not need adapter integration tests for every edge case.

3. **Default `/` to forward search; make `n` repeat last direction and `N` invert it.**
   - Rationale: matches common Vim behavior while keeping first version small.
   - Alternative considered: include `?` backward search immediately. Rejected as scope creep; state shape should allow it later.

4. **Use literal substring matching for v1.**
   - Rationale: prompt-buffer search should be predictable and safe without regex escaping or syntax errors.
   - Alternative considered: JavaScript `RegExp`. Rejected because Vim regex parity is deep and error-prone.

5. **Search prompt feedback is status-only and width-safe.**
   - Render a compact pending-search indicator (for example `/query`) through existing status/render seams if needed.
   - Rationale: user needs feedback while typing query, but no full command-line renderer is needed.
   - Alternative considered: insert temporary query text into prompt. Rejected because it changes user content and cursor math.

## Risks / Trade-offs

- Search query collection may conflict with existing pending operator/register/mark state → Only enter search from modes where `/` is valid; `Esc` cancels and clears pending search.
- Search across multi-line prompt can produce off-by-one cursor bugs → Keep matching in buffer helpers with unit tests for line boundaries, wrap-around, and no-match cases.
- Operator-pending search ranges may differ from exact Vim edge cases → Define tested prompt-local behavior and keep unsupported offsets out of scope.
- Status rendering can overflow narrow terminals → Reuse existing width-safe status rendering and truncate pending query display.
- `n`/`N` before any completed search could surprise users → Treat as safe no-op with prompt text and cursor unchanged.

## Migration Plan

1. Add search state/types and command parsing for `/`, `n`, and `N`.
2. Add pure buffer search helpers and range helpers with tests.
3. Wire normal-mode search query collection, cancellation, completion, and repeat navigation.
4. Wire visual-mode and operator-pending behavior using the same search target helper.
5. Add integration tests for prompt editing behavior and preserve insert-mode slash delegation.
6. Update README and `TODOS.md` only after implementation passes validation.
7. Run `bun test`, `bun run check-types`, and OpenSpec validation for `todos-search-functionality`.

Rollback is removing the new key bindings/state and leaving `/` listed as unsupported in `TODOS.md`; no persisted data or dependency rollback is required.

## Open Questions

None. v1 uses literal, prompt-local, wrap-around search. `/` starts forward search; `n` repeats last direction; `N` inverts it. `?` backward search remains out of scope.
