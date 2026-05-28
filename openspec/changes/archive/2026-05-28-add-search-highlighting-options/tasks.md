## 1. Configuration

- [x] 1.1 Add `VimSearchOptions`/resolved option types and defaults for `highlight`, `highlightCurrent`, `clearOnCancel`, `clearOnInsert`, and `maxHighlights`.
- [x] 1.2 Parse and validate `piVimMode.search`, preserving field-level fallback and warnings.
- [x] 1.3 Add config tests for defaults, valid settings, invalid fallback, and disabled highlighting.

## 2. Search Highlight State

- [x] 2.1 Add modal state for visible search highlights separate from repeatable `lastSearch`.
- [x] 2.2 Update successful `/`, `n`, and `N` flows to set query/current match highlight state when enabled.
- [x] 2.3 Preserve previous highlights on no-match searches and clear highlights for operator edits when remaining highlights would be stale.
- [x] 2.4 Clear highlights on search cancel and insert-mode transitions according to config.
- [x] 2.5 Add modal tests for highlight state updates, no-match preservation, current-match repeat updates, and configured clear behavior.

## 3. Rendering

- [x] 3.1 Add pure helper to find bounded non-overlapping literal match ranges across prompt lines.
- [x] 3.2 Extend renderer input to accept search highlight ranges/current match and render precedence cursor > visual > current search > other search.
- [x] 3.3 Route normal and visual editor rendering through the highlight-capable renderer without regressing cursor styles or width safety.
- [x] 3.4 Add render/editor tests for normal highlights, current highlight, visual overlap precedence, width safety, and max highlight cap.

## 4. Documentation

- [x] 4.1 Update README config example and option reference for `piVimMode.search`.
- [x] 4.2 Update README limitations for fixed ANSI highlight styles and out-of-scope Vim highlight groups/`:nohlsearch`.

## 5. Validation

- [x] 5.1 Run `bun test` and fix failures.
- [x] 5.2 Run `bun run check-types` and fix TypeScript errors.
- [x] 5.3 Run `openspec validate add-search-highlighting-options --strict` and fix artifact/spec issues.
