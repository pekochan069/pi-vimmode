## 1. Keymap Types and Config

- [x] 1.1 Add `piVimMode.keymap.insert.openLineBelow` and `openLineAbove` types with empty resolved defaults.
- [x] 1.2 Add config tests for default empty insert bindings, accepted `ctrl+j` / `ctrl+k`, raw printable rejection, invalid field fallback, and sibling preservation.
- [x] 1.3 Implement config parsing/normalization for insert newline bindings, including same-layer `allowProtectedOverrides` checks for protected keys.
- [x] 1.4 Update option cloning/live editor construction coverage so the new nested keymap survives `VimEditor` option resolution.

## 2. Modal Dispatch

- [x] 2.1 Add modal tests for default insert delegation, configured open-line-below, configured open-line-above, empty prompt behavior, autocomplete delegation, and search-highlight clearing.
- [x] 2.2 Route configured insert newline keys in `handleInsertInput` after escape/autocomplete handling and before default delegation.
- [x] 2.3 Reuse existing `openLineBelow` / `openLineAbove` edit semantics without writing registers, marks, dot-repeat, macro slots, or visual state.
- [x] 2.4 Add or update fast-path tests proving configured insert newline chords take the modal path and ordinary insert text still fast-delegates when safe.

## 3. Docs and TODOs

- [x] 3.1 Document insert newline settings, empty defaults, valid key forms, protected-key allow-list rules, and non-goals in `docs/settings.md`.
- [x] 3.2 Document insert-mode newline behavior and autocomplete delegation in `docs/features.md`.
- [x] 3.3 Mark `TODOS.md` insert-mode newline keybindings item complete.

## 4. Validation

- [x] 4.1 Run `bun test`.
- [x] 4.2 Run `bun run check-types`.
- [x] 4.3 Run `bun run lint`.
- [x] 4.4 Run `bun run format:check`.
- [x] 4.5 Run `openspec validate --specs --strict`.
