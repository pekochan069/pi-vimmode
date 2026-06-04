## 1. Workbench State and Pure Helpers

- [ ] 1.1 Add typed workbench state for search and Ex entries, preserving search operator payload and Ex visual source metadata.
- [ ] 1.2 Implement pure workbench helper operations for append, backspace, cancel, history previous/next, draft restore, preview invalidation, and display prefix.
- [ ] 1.3 Add focused unit tests for workbench helper state transitions, history bounds, draft restore, and preview clearing.
- [ ] 1.4 Refactor existing pending `/` and `:` flows to use the workbench helper while preserving current literal search and Ex behavior.

## 2. Search Semantics

- [ ] 2.1 Add `startSearchBackward` command type/default keymap binding and command parser support for `?`.
- [ ] 2.2 Extend search state to record matcher mode and direction separately from history entries.
- [ ] 2.3 Implement backward `?` search in normal, visual, and operator-pending contexts.
- [ ] 2.4 Implement empty `/` and `?` recall from the previous successful search query and matcher mode.
- [ ] 2.5 Add prompt-local search history recording and pending workbench history navigation.
- [ ] 2.6 Add bounded regex search opt-in with `\r` prefix, invalid regex errors, bound errors, and zero-length match rejection.
- [ ] 2.7 Add modal tests for `/`, `?`, `n`, `N`, recall, search history, regex search, invalid regex safety, visual search, operator search, and insert-mode delegation.

## 3. Ex Parser and Substitution Matching

- [ ] 3.1 Extend Ex substitution parse result to include matcher mode and accept `r` flag alongside existing `g` and `i` flags.
- [ ] 3.2 Add pure bounded regex substitution/count helpers in `src/buffer.ts` while keeping literal substitution helpers intact.
- [ ] 3.3 Keep replacement text literal in regex mode and add tests for `&`, `$1`, and `\1` replacement tokens.
- [ ] 3.4 Reject invalid regex syntax, exceeded regex bounds, unsupported flags, and zero-length regex matches without mutating prompt text.
- [ ] 3.5 Add Ex parser and buffer tests for literal default behavior, regex flag behavior, `g`/`i`/`r` flag combinations, alternate delimiters, omitted delimiters, errors, and bounds.

## 4. Ex Workbench History and Preview Flow

- [ ] 4.1 Implement Ex command history for successfully executed commands, excluding failed commands and substitution preview-only entries.
- [ ] 4.2 Implement two-phase substitution preview/apply tied to exact command text and parsed matcher state.
- [ ] 4.3 Clear substitution preview on typing, backspace, history navigation, cancellation, new workbench entry, or command text change.
- [ ] 4.4 Preserve visual Ex cancellation behavior after history navigation and preview cancellation.
- [ ] 4.5 Preserve Ex side effects: registers for delete/yank/put only, no dot-repeat updates, search highlight clearing only for text-changing commands, cursor intent clamping after edits.
- [ ] 4.6 Add modal tests for Ex history, substitution preview/apply, cancel, stale preview invalidation, no-match errors, identical replacement success, visual range capture, and side-effect boundaries.

## 5. Render, View, and Adapter Integration

- [ ] 5.1 Update modal pending display/view derivation to render `/`, `?`, `:`, preview, success, and error workbench states from shared state.
- [ ] 5.2 Update render path so search and Ex workbench rows are width-safe and shrink prompt viewport consistently.
- [ ] 5.3 Verify visual selection, search highlights, cursor styling, status UI, and workbench rows compose without precedence regressions.
- [ ] 5.4 Update `VimEditor` option cloning and live editor construction paths for any new keymap/search/workbench option fields.
- [ ] 5.5 Add render and live `VimEditor` tests for workbench rows, long input truncation, preview messages, regex errors, viewport shrink, option propagation, and protected Pi shortcut delegation.

## 6. Documentation and Roadmap

- [ ] 6.1 Update `docs/features.md` with `/`, `?`, history, empty-query recall, regex opt-in, regex bounds, substitution preview/apply flow, literal replacements, and current limitations.
- [ ] 6.2 Update `docs/settings.md` with `piVimMode.keymap.commands.startSearchBackward`, default `?`, insert-mode delegation, and finite workbench history behavior.
- [ ] 6.3 Update any feature matrix or documentation references that still claim `?`, search history, `:nohlsearch`, or regex modes are unsupported.
- [ ] 6.4 Mark `Safe Ex/Search workbench` complete in `TODOS.md` only after validation passes.

## 7. Validation

- [ ] 7.1 Run `bun test` and fix failures.
- [ ] 7.2 Run `bun run check-types` and fix failures.
- [ ] 7.3 Run `bun run lint` and fix failures.
- [ ] 7.4 Run `bun run format:check` and fix failures.
- [ ] 7.5 Run `openspec validate --specs --strict` and fix failures.
- [ ] 7.6 Re-run `openspec status --change "safe-ex-search-workbench"` and confirm apply-required artifacts are complete.
