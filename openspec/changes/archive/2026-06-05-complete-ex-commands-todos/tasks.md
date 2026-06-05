## 1. Baseline Drift Cleanup

- [x] 1.1 Add or confirm focused tests proving shipped Ex TODO behavior: regex `r` substitution, range offsets, semicolon ranges, destination offsets, and Ex history.
- [x] 1.2 Update `docs/features.md` limitations so shipped Ex behavior is not listed as unsupported.
- [x] 1.3 Update `TODOS.md ## Ex Commands` to mark shipped items complete and leave only work implemented or explicitly deferred by this change.

## 2. Modal Handler Extraction

- [x] 2.1 Extract behavior-preserving Ex command execution helpers from `src/modal/engine.ts` or `src/modal/ex-command-line.ts` so new substitution/register branches do not grow large handlers.
- [x] 2.2 Extract behavior-preserving normal/visual command-handler helpers where needed to keep changed functions near the project line-count guideline.
- [x] 2.3 Run focused existing modal tests after extraction and fix any behavior regressions before adding new behavior.

## 3. Substitution Flags and Repeat Commands

- [x] 3.1 Extend `src/ex.ts` parsed substitution types and parser tests for `n`, `e`, `:&`, `:&&`, and range-qualified repeat forms such as `:%&`.
- [x] 3.2 Add modal state for semantic last applied substitution, separate from `exHistory`, with tests proving history recall is not used as repeat source.
- [x] 3.3 Implement count-only `n` substitutions with count messages, no prompt mutation, no apply preview, successful history recording, and no repeat-source update.
- [x] 3.4 Implement no-error `e` substitutions with zero-match non-error results while preserving real errors for invalid syntax, invalid ranges, invalid regex, and unsupported flags.
- [x] 3.5 Implement repeat substitution through the existing preview/apply path, including no-previous-substitution safety, range resolution, updated repeat source after apply, and existing side-effect preservation.
- [x] 3.6 Add modal/integration tests for literal, regex, ignore-case, global, count-only, no-error, repeat, identical replacement, failed parse, failed range, and no-match behavior.

## 4. Ex Register Operands

- [x] 4.1 Extend Ex line-command parser types/tests for optional alphabetic register operands on `:delete`, `:yank`, and `:put` while rejecting quoted, multi-character, numeric, special, and unsupported operands.
- [x] 4.2 Reuse existing register helper semantics so `:delete a` and `:yank a` write named plus unnamed registers, while uppercase write operands append to lowercase named registers.
- [x] 4.3 Implement `:put a` and `:put A` named-register reads, including missing/empty named register errors that leave prompt text and registers unchanged.
- [x] 4.4 Add modal tests for lowercase writes, uppercase append writes, unnamed defaults, uppercase put reads, visual-source Ex ranges, invalid operands, search-highlight clearing, and dot-repeat preservation.

## 5. Cursor-Aware Ex Command-Line Editing

- [x] 5.1 Add a bounded pending-Ex command cursor model and pure command-line editing helper for insert, Backspace, Delete, Left, Right, Home, End, word-left, word-right, and delete-word behavior.
- [x] 5.2 Integrate command-line cursor handling with `handlePendingExInput` so prompt text is never edited, cursor bounds are clamped, and every command-text edit clears substitution preview.
- [x] 5.3 Update Ex history navigation so recalled entries replace command text, restore drafts, move the command cursor to the end, and preserve visual Ex cancellation state.
- [x] 5.4 Add tests for cursor insertion, deletion, word deletion, history after cursor edits, preview clearing, cancellation, and visual-source restoration.

## 6. Workbench Row Reservation Config

- [x] 6.1 Add `piVimMode.ui.workbench.reservedRows` to public types, defaults, clone/options propagation, and field-by-field config parsing with warnings for invalid values.
- [x] 6.2 Update `VimEditor` rendering so workbench rows reserve `max(activeWorkbenchRows, reservedRows)`, preserve default layout when unset, and render idle blank rows width-safely.
- [x] 6.3 Add config and live-editor tests proving valid reserved rows render, invalid fields fall back without discarding sibling UI settings, and constructed editors honor resolved config.
- [x] 6.4 Add render tests for default active row, reserved idle rows, active Ex/search/messages within reserved rows, tiny terminal heights, status UI, visual selections, search highlights, and long workbench text.

## 7. Docs and Runtime Help Sync

- [x] 7.1 Update `docs/features.md` with count-only/no-error substitution flags, repeat substitution, Ex register operands, cursor-aware Ex editing, reserved workbench rows, and explicit limitations.
- [x] 7.2 Update `docs/settings.md` with `piVimMode.ui.workbench.reservedRows`, default behavior, supported bounds, examples, warnings, and viewport trade-offs.
- [x] 7.3 Update runtime help or feature metadata if user-visible `:help`, `:features`, or drift guards summarize Ex/workbench capabilities.
- [x] 7.4 Add or update documentation drift tests so supported Ex behavior is not documented as unsupported and unsupported Vim parity remains clearly listed.

## 8. Validation

- [x] 8.1 Run `bun test`.
- [x] 8.2 Run `bun run check-types`.
- [x] 8.3 Run `bun run lint`.
- [x] 8.4 Run `bun run format:check`.
- [x] 8.5 Run `openspec validate complete-ex-commands-todos --type change --strict`.
- [x] 8.6 Run `openspec validate --specs --strict`.
