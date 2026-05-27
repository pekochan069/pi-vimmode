## 1. Inventory and API Shape

- [x] 1.1 Inventory `src/buffer.ts` exports and external imports from `src/vim-editor.ts`, `src/render.ts`, and tests.
- [x] 1.2 Define operation-level buffer API groups for navigation, visual operations, linewise operations, operator-motion operations, and paste.
- [x] 1.3 Decide which low-level helpers must remain exported for rendering or tests and mark the rest for privatization.

## 2. Prompt Buffer Operations

- [x] 2.1 Add navigation operation APIs for buffer start/end, first non-blank, line/word motions, and matching pair behavior.
- [x] 2.2 Add visual operation APIs for characterwise and linewise selection text, summaries, yank, delete, and change.
- [x] 2.3 Add linewise operation APIs for delete line, change line, yank line, open above/below, and join line.
- [x] 2.4 Add operator-motion APIs for delete, change, and yank by supported motions.
- [x] 2.5 Add paste operation APIs for characterwise and linewise registers before and after cursor/current line.

## 3. Call-Site Migration

- [x] 3.1 Update `src/vim-editor.ts` to call prompt buffer operations instead of composing low-level helpers.
- [x] 3.2 Update `src/render.ts` to use the narrowest rendering-facing buffer API needed for visual highlights and summaries.
- [x] 3.3 Make low-level helpers private where no production call site requires them.

## 4. Tests and Validation

- [x] 4.1 Expand `test/buffer.test.ts` to cover navigation operation contracts, including clamping and missing matching-pair behavior.
- [x] 4.2 Expand `test/buffer.test.ts` to cover visual characterwise and linewise operation contracts.
- [x] 4.3 Expand `test/buffer.test.ts` to cover linewise operation contracts, including editable empty-prompt and join-last-line behavior.
- [x] 4.4 Expand `test/buffer.test.ts` to cover operator-motion delete/change/yank contracts.
- [x] 4.5 Expand `test/buffer.test.ts` to cover paste before/after for characterwise, linewise, and empty registers.
- [x] 4.6 Run project validation (`bun test` and typecheck script if present) and fix regressions without changing user-facing behavior.

## 5. Documentation and Cleanup

- [x] 5.1 Update README or keymap docs only if public behavior documentation needs boundary wording; otherwise leave user docs unchanged.
- [x] 5.2 Remove dead helper exports/imports after validation passes.
- [x] 5.3 Re-run OpenSpec validation for `deepen-buffer-ts-prompt-buffer-module`.
