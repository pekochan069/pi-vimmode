## 1. Buffer Helpers

- [x] 1.1 Add a pure case transform helper in `src/buffer.ts` for lowercase, uppercase, and toggle actions over character ranges, line ranges, and block ranges.
- [x] 1.2 Preserve one-code-point-safe case conversion so expanding Unicode mappings and non-letter characters stay unchanged.
- [x] 1.3 Add `test/buffer.test.ts` coverage for lower, upper, toggle, line, block, non-letter, empty-range, and Unicode expansion-guard behavior.

## 2. Parser, Types, and Keymap Config

- [x] 2.1 Add semantic case operator actions to `src/types.ts` and default `gu`, `gU`, and `g~` descriptors in `src/keymap-descriptors.ts`.
- [x] 2.2 Extend operator-motion keymap resolution so case operators support configured finite motion targets and reject shift operator motion config.
- [x] 2.3 Update `src/commands.ts` parser tests for `guw`, `gUiw`, `g~g~`, counts, `g` prefix collisions, configured case operators, and invalid unsupported targets.
- [x] 2.4 Add config validation tests for valid case operator bindings, invalid/protected/conflicting bindings, operatorMotions case entries, and sibling-field preservation.

## 3. Modal Integration

- [x] 3.1 Add normal-mode case operator application in `src/modal/normal.ts` for motion, text-object, and line targets without writing registers or entering insert mode.
- [x] 3.2 Reject case operator mark, search, character-search, and unsupported command targets safely in modal routing.
- [x] 3.3 Add repeat-state support so successful normal case operator changes replay with `.` at a new valid target.
- [x] 3.4 Add modal tests for normal case motion/text-object/line transforms, safe no-op behavior, register preservation, cursor placement, and dot-repeat.

## 4. Visual and Live Editor Coverage

- [x] 4.1 Add visual-mode lowercase `u`, uppercase `U`, and toggle `~` handling for character, line, and block selections.
- [x] 4.2 Add visual modal tests for selection clearing, normal-mode return, register preservation, and block cell-only transforms.
- [x] 4.3 Add one live `VimEditor` smoke test proving configured case operator options survive construction and execute through the adapter path.

## 5. Documentation and TODO Cleanup

- [x] 5.1 Update `docs/features.md` with normal and visual case operator behavior, supported targets, repeat behavior, register behavior, and non-goals.
- [x] 5.2 Update `docs/settings.md` with `piVimMode.keymap.operators.lowercase`, `uppercase`, `toggleCase`, and case operatorMotions behavior.
- [x] 5.3 Mark the `TODOS.md` case-operators item complete after implementation and validation pass.

## 6. Validation

- [x] 6.1 Run `bun test`.
- [x] 6.2 Run `bun run check-types`.
- [x] 6.3 Run `bun run lint`.
- [x] 6.4 Run `bun run format:check`.
- [x] 6.5 Run `openspec validate add-case-operators --type change --strict`.
- [x] 6.6 Run `openspec validate --specs --strict`.
