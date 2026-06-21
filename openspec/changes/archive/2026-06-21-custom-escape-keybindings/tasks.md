## 1. Config and Types

- [x] 1.1 Add `escape` to public and resolved keymap types with default `[]`.
- [x] 1.2 Parse `piVimMode.keymap.escape` with existing key normalization and protected shortcut warnings.
- [x] 1.3 Reject raw printable aliases such as `j`, `jk`, and `jj` with a field-level warning.
- [x] 1.4 Merge and clone `escape` through global/project config resolution and live `VimEditor` option construction.
- [x] 1.5 Add config tests for accepted `<C-j>`/`<D-j>`, rejected `jk`/`jj`, invalid field fallback, protected shortcut rejection, and normal `j`/`k` keymap preservation.

## 2. Insert Escape Modal Matching

- [x] 2.1 Add modal state cleanup for insert escape handling.
- [x] 2.2 Add a small helper that classifies insert escape input as matched, mismatched, or ignored.
- [x] 2.3 Wire insert-mode handling so matched aliases enter normal mode and unmatched input delegates normally.
- [x] 2.4 Keep configured aliases disabled while autocomplete is open and preserve physical `Esc` behavior.
- [x] 2.5 Add focused modal tests for modifier alias match, unmatched delegation, autocomplete bypass, physical `Esc`, and no-config defaults.
- [x] 2.6 Extend configured aliases to visual, visual-line, and visual-block escape handling.

## 3. Adapter Fast Path

- [x] 3.1 Update `canFastDelegateInsertInput` so configured alias input and pending insert escape state route through modal handling.
- [x] 3.2 Keep unrelated insert text on the existing fast path when safe.
- [x] 3.3 Add fast-path tests proving configured modifier aliases stay on the modal path, `a` can still fast-delegate, and no-config behavior is unchanged.

## 4. Live Editor Behavior

- [x] 4.1 Add `VimEditor` tests proving `<D-j>` exits insert mode without inserting text.
- [x] 4.2 Add `VimEditor` tests proving `<C-j>` exits insert mode when sent as distinct enhanced keyboard input.
- [x] 4.3 Add `VimEditor` tests proving raw `jk` config is rejected and typing `jk` stays insert text.
- [x] 4.4 Add `VimEditor` tests proving ordinary insert text remains delegated.
- [x] 4.5 Add autocomplete tests proving configured aliases delegate while autocomplete is open.
- [x] 4.6 Add macro recording/replay tests proving configured aliases reproduce insert text and mode transition without inserting alias text.
- [x] 4.7 Add regression coverage for unchanged default side effects.
- [x] 4.8 Add live editor coverage for configured aliases exiting visual mode.

## 5. Diagnostics and Docs

- [x] 5.1 Update keymap diagnostics/catalog helpers to report configured escape aliases as escape bindings.
- [x] 5.2 Add diagnostics tests for `:keymap`, `:mapcheck`, `:keybindings`, or `:features` output that includes escape aliases without broad Vim mapping claims.
- [x] 5.3 Update `docs/settings.md` with `piVimMode.keymap.escape`, modifier-key examples, validation rules, autocomplete behavior, and Ctrl-J terminal ambiguity.
- [x] 5.4 Update `docs/features.md` escape/reset behavior with configured escape aliases.
- [x] 5.5 Update runtime help/drift guard metadata or fixtures if diagnostics/docs anchors require it.

## 6. Validation

- [x] 6.1 Run `bun test`.
- [x] 6.2 Run `bun run check-types`.
- [x] 6.3 Run `bun run lint`.
- [x] 6.4 Run `bun run format:check`.
- [x] 6.5 Run `openspec validate --specs --strict`.
- [x] 6.6 Run `graphify update .` after code changes.
