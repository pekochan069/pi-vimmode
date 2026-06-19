# v0.4.0

## What's new

### Word-under-cursor search

- Added Vim-style `*` and `#` normal-mode search for the keyword word under the cursor.
- Reuses prompt search state, so `n` and `N` repeat correctly and search history/highlights stay consistent with `/` and `?`.
- Supports custom keybindings via `piVimMode.keymap.commands.searchWordForward` and `piVimMode.keymap.commands.searchWordBackward`.
- Insert-mode `*` and `#` still delegate to Pi text input.

### Paragraph motions

- Added Vim paragraph motions: `{` moves to the previous paragraph start and `}` moves to the next paragraph.
- Added paragraph text objects: `ip` selects the current blank-line-delimited paragraph body, and `ap` includes one adjacent blank separator group.
- Paragraph motions and text objects support custom keybindings via `piVimMode.keymap.motions.paragraphBackward`, `piVimMode.keymap.motions.paragraphForward`, and `piVimMode.keymap.textObjects.targets.paragraph`.
- Updated feature/settings docs and OpenSpec coverage for paragraph behavior.

## Bug fixes

- Kept brace text objects (`i{`, `a}`, etc.) distinct from paragraph motion keys by resolving behavior through parser context.
