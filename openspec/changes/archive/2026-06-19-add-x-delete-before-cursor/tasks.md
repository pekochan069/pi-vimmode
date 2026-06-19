## 1. Parser and Command Model

- [x] 1.1 Add `deleteCharBefore` to `VimCommandAction` in `src/types.ts`.
- [x] 1.2 Add `deleteCharBefore` default key `X` to `KEYMAP_COMMAND_DESCRIPTORS` in `src/keymap-descriptors.ts`.
- [x] 1.3 Update command descriptor/keymap tests so the new command appears in default command coverage.

## 2. Buffer Operation

- [x] 2.1 Add a pure `deleteCharBefore(text, cursor, count)` helper in `src/buffer.ts` that deletes only within the current line.
- [x] 2.2 Add `test/buffer.test.ts` coverage for single-character delete, counted delete, column-zero no-op, count clamping, cursor placement, and character register text.

## 3. Modal Integration

- [x] 3.1 Wire `deleteCharBefore` in `src/modal/normal.ts` as a register-aware normal command, matching `deleteChar` repeat/register semantics.
- [x] 3.2 Add modal tests for `X`, `3X`, line-start no-op, unnamed register behavior, and dot-repeat behavior.
- [x] 3.3 Add a focused test proving `X` remains distinct from `Ctrl+X` numeric decrement.

## 4. Adapter and Documentation

- [x] 4.1 Add or update `test/vim-editor.test.ts` coverage for user-visible `X` behavior through `VimEditor`.
- [x] 4.2 Update `docs/features.md` normal-mode keymap/count examples to document `X`.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate --specs --strict`.
