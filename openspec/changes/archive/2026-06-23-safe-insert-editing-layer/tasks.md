## 1. Keymap Types and Config

- [x] 1.1 Add `VimInsertAction` coverage for `deleteWordBackward`, `deleteWordForward`, `deleteLineBackward`, `deleteLineForward`, `moveWordBackward`, `moveWordForward`, `moveLineStart`, and `moveLineEnd` in `src/types.ts`.
- [x] 1.2 Add new insert action descriptors/default empty arrays in `src/keymap-descriptors.ts` and keep `openLineBelow` / `openLineAbove` unchanged.
- [x] 1.3 Update `src/config.ts` insert allow-list, defaults, clone/merge paths, and live option propagation for every insert action.
- [x] 1.4 Add config tests for accepted insert edit/movement bindings, default empty arrays, invalid field fallback, raw printable rejection, protected allow-list behavior, duplicate binding diagnostics, and live editor option cloning.

## 2. Buffer Helpers

- [x] 2.1 Add pure insert movement helpers in `src/buffer.ts` for word backward/forward and current-line start/end using existing small-word and line-boundary semantics.
- [x] 2.2 Add pure insert delete helpers in `src/buffer.ts` for word backward/forward and line backward/forward that return `EditResult` without `register`.
- [x] 2.3 Add buffer tests for small-word movement/deletion, current-line start/end movement, prompt-boundary no-ops, register-free edit results, and `deleteLineForward` EOL newline join preserving spaces.

## 3. Modal Integration

- [x] 3.1 Extend insert dispatch in `src/modal/engine.ts` to handle configured edit actions with existing edit effects and configured movement actions with cursor restore effects.
- [x] 3.2 Preserve insert-mode delegation for normal text, unconfigured keys, autocomplete-active input, and prompt transform action bindings.
- [x] 3.3 Add modal/editor tests for configured insert actions, autocomplete delegation, no register writes, search highlight behavior for edit vs movement actions, and unchanged `openLineBelow` / `openLineAbove` behavior.

## 4. Documentation

- [x] 4.1 Update `docs/settings.md` with every `piVimMode.keymap.insert` action, empty defaults, valid key forms, protected-key allow-list behavior, duplicate diagnostics, and non-goals.
- [x] 4.2 Update `docs/features.md` with separate readline-style and home-row-mod examples, `ctrl+k` conflict note, small-word semantics, autocomplete delegation, and prompt-transform boundary.
- [x] 4.3 Update release/package notes if existing release docs require new user-facing feature entries.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate --specs --strict`.
- [x] 5.6 Run `graphify update .` after code/doc changes.
