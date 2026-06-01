## 1. Ex Parser

- [x] 1.1 Generalize `src/ex.ts` from substitution-only parsing to a `parseExCommand` discriminated union while preserving existing substitution behavior.
- [x] 1.2 Add exact command-name and alias parsing for `delete`/`d`, `yank`/`y`, `put`/`pu`, `copy`/`t`, `move`/`m`, `join`/`j`, and `nohlsearch`/`noh`.
- [x] 1.3 Keep existing range parsing for command ranges and add destination-address parsing for copy/move with destination `0`, numeric, `.`, and `$`.
- [x] 1.4 Reject unsupported commands, unsupported abbreviations, invalid ranges, missing destinations, invalid destinations, and unexpected trailing arguments with readable Ex errors.
- [x] 1.5 Extend parser tests in `test/ex.test.ts` for new commands, aliases, destination addresses, destination `0`, invalid `:0delete`, missing destination, and preserved substitution parsing.

## 2. Prompt Buffer Operations

- [x] 2.1 Add line-range helpers in `src/buffer.ts` for Ex delete, yank, put, copy, move, and join using existing split/join/clamp conventions.
- [x] 2.2 Ensure Ex delete/yank produce linewise unnamed-register payloads and Ex put inserts unnamed register text as prompt-buffer lines.
- [x] 2.3 Implement copy/move destination semantics, including destination `0` insertion before first line and move-overlap rejection.
- [x] 2.4 Implement join semantics for omitted range current+next, explicit ranges, `%join`, whitespace normalization, cursor placement, and last-line rejection.
- [x] 2.5 Add focused buffer tests for delete/yank/put/copy/move/join success paths, cursor placement, register payloads, destination edge cases, and no-change/error cases.

## 3. Modal Engine Integration

- [x] 3.1 Update `executeExCommand` in `src/modal/engine.ts` to dispatch every parsed Ex command branch and preserve existing Ex command-line lifecycle behavior.
- [x] 3.2 Wire register side effects: Ex delete/yank write only the unnamed register, Ex put reads only the unnamed register, and named registers remain unchanged.
- [x] 3.3 Clear visible search highlights only for text-changing Ex commands and `:nohlsearch`; preserve last-search repeat state after `:nohlsearch`.
- [x] 3.4 Keep Ex text edits out of dot-repeat state and preserve existing macro recording/replay of Ex command-line keystrokes.
- [x] 3.5 Add transient Ex success/error messages with line counts and readable failures for empty register, missing destination, invalid destination, overlap, unsupported command, and trailing arguments.

## 4. Integration Tests and Documentation

- [x] 4.1 Add `test/vim-editor.test.ts` coverage for each new Ex command from normal mode, including aliases and success messages.
- [x] 4.2 Add integration coverage for visual-range `:delete`, search-highlight clearing, `:nohlsearch` preserving `n`/`N`, unnamed-register behavior, named-register preservation, and dot-repeat preservation.
- [x] 4.3 Update `docs/features.md` and `README.md` Ex command-line sections with supported command list, examples, side effects, and remaining limitations.
- [x] 4.4 Update `TODOS.md` to mark the completed "more Ex commands" slice and leave deferred items for regex substitution, flags, offsets, semicolon ranges, history/repeat, and Ex register operands.

## 5. Validation

- [x] 5.1 Run `openspec validate add-more-ex-commands --type change --strict` and fix any spec errors.
- [x] 5.2 Run `bun test` and fix failures.
- [x] 5.3 Run `bun run check-types` and fix type errors.
