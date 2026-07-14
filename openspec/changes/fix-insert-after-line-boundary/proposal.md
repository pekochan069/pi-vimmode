## Why

The normal-mode `a` command currently delegates an unconditional right-arrow to Pi. When the cursor is already at a logical line end and another prompt line follows, Pi correctly moves to the next line, but pi-vimmode thereby violates `a` semantics by entering insert mode on the following line.

## What Changes

- Keep `a` on the current logical line when invoked at that line's end, including before blank lines in long wrapped prompts.
- Preserve current `a` behavior when the cursor points at an existing character: enter insert mode immediately after that character.
- Add focused modal-effect coverage for both paths and a live `VimEditor` regression for EOL before a following line.
- Clarify `a` behavior in the feature guide.

### Non-goals

- Changing Pi's native right-arrow behavior.
- Changing normal or visual `l`/Right motion behavior.
- Adding a configuration option for newline crossing.
- Claiming broader Vim/Neovim cursor parity beyond this practical prompt-editing command.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-mode-editor`: Define that normal-mode `a` enters insert mode after the current character without crossing the current logical line boundary.

## Impact

- **Modal semantics:** `src/modal/normal.ts` will conditionally request rightward adapter movement based on the current logical line and cursor position.
- **Adapter integration:** `src/vim-editor.ts` remains unchanged unless live-editor regression testing exposes an adapter-specific need; Pi continues to own native cursor movement.
- **Tests:** focused modal tests and real-editor tests will cover insertion after an existing character, insertion at logical EOL before a following blank line, and long wrapped prompt behavior.
- **Documentation:** `docs/features.md` will describe the line-boundary behavior of `a`.
- **Compatibility:** bug fix, non-breaking; no settings migration and no keymap change.
- **Dependencies:** no new runtime or peer dependencies.
