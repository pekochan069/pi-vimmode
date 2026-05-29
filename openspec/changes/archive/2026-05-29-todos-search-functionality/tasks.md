## 1. Types and Command Parsing

- [x] 1.1 Add modal search state types for pending query collection and last successful search direction/query.
- [x] 1.2 Add command parsing support for `/`, `n`, and `N` without affecting insert-mode delegation.
- [x] 1.3 Add parser tests for starting search, repeat search, inverted repeat search, and invalid pending combinations.

## 2. Buffer Search Primitives

- [x] 2.1 Implement pure literal search helpers that find next and previous match positions across multi-line prompt text with wrap-around.
- [x] 2.2 Implement range calculation helpers for applying search targets as operator motions.
- [x] 2.3 Add buffer tests for later matches, wrapped matches, backward matches, empty queries, missing matches, line boundaries, and repeated matches.

## 3. Modal Search Flow

- [x] 3.1 Wire normal-mode `/` to enter pending search state without mutating prompt text.
- [x] 3.2 Collect printable query input, support backspace if existing input handling exposes it, and complete search on `Enter`.
- [x] 3.3 Cancel pending search on `Esc` and restore normal mode without prompt changes.
- [x] 3.4 Record last successful search only after a match moves the cursor.
- [x] 3.5 Wire `n` and `N` to repeat or invert last successful search, with safe no-op behavior when no prior search exists.

## 4. Visual and Operator Integration

- [x] 4.1 Allow `/` search completion in visual mode to move the active cursor while preserving the visual anchor and prompt text.
- [x] 4.2 Allow `n` and `N` in visual mode to extend the active selection using the last successful search.
- [x] 4.3 Allow pending delete/change/yank operators to consume `/` search as a motion target.
- [x] 4.4 Ensure operator search no-match behavior clears pending operator safely without changing prompt text.
- [x] 4.5 Add modal tests for visual search, visual repeat search, operator delete/change/yank search, no-match behavior, and mode transitions.

## 5. Adapter, Status, and Integration Tests

- [x] 5.1 Apply modal effects in `VimEditor` so search cursor movement restores cursor and invalidates render consistently.
- [x] 5.2 Add pending search status feedback if needed, keeping narrow terminal rendering width-safe.
- [x] 5.3 Add Vim editor integration tests for normal `/` search, cancellation, `n`, `N`, wrap-around, and insert-mode slash delegation.
- [x] 5.4 Verify Pi application shortcuts and submit behavior remain delegated outside explicit search handling.

## 6. Documentation and TODOs

- [x] 6.1 Update README supported keymap with `/`, `n`, `N`, literal prompt-local wrap-around behavior, and limitations.
- [x] 6.2 Update README limitations to keep regex search, `?`, search history, highlighting, and global prompt search out of scope.
- [x] 6.3 Update `TODOS.md` to mark `/` search complete only after implementation and validation pass.

## 7. Validation

- [x] 7.1 Run `bun test` and fix failures.
- [x] 7.2 Run `bun run check-types` and fix TypeScript errors.
- [x] 7.3 Run OpenSpec validation for `todos-search-functionality` and fix artifact or spec issues.
