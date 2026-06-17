## 1. Config Clone Tests

- [x] 1.1 Add `test/config.test.ts` coverage proving `resolveVimOptions(undefined)` returns keymap, prompt transform command, and UI nested arrays/objects that can be mutated without changing `DEFAULT_VIM_OPTIONS`.
- [x] 1.2 Add `test/config.test.ts` coverage proving resolved options cloned from valid caller settings do not share mutable keymap, prompt transform command, or UI nested arrays/objects with the caller-provided settings object.
- [x] 1.3 Add or extend live `VimEditor` construction coverage only if existing tests do not prove caller-owned option mutation cannot affect live editor behavior.

## 2. Config Clone Helper Refactor

- [x] 2.1 Add narrow local helpers in `src/config.ts` for cloning record-of-array maps and shallow record/object shapes without using broad recursive cloning or new dependencies.
- [x] 2.2 Refactor `cloneKeymap` to use the helpers for operators, motions, macros, marks, text objects, commands, and operator motions while keeping action binding arg cloning explicit.
- [x] 2.3 Refactor `clonePromptTransforms` to use the helpers for command sequence maps while preserving `enabled` and `actions` semantics.
- [x] 2.4 Refactor `cloneUi` to use shared helpers for status items, mode labels/narrow labels, selection, cursor position, and workbench fields.
- [x] 2.5 Confirm `cloneDefaultOptions`, merge functions, warning behavior, protected shortcut rejection, and valid-sibling fallback behavior remain unchanged.

## 3. Validation

- [x] 3.1 Run `bun test`.
- [x] 3.2 Run `bun run check-types`.
- [x] 3.3 Run `bun run lint`.
- [x] 3.4 Run `bun run format:check`.
- [x] 3.5 Run `openspec validate --specs --strict`.
