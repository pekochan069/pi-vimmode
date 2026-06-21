# v0.4.0

## What's new

### Paragraph motions

- Added Vim paragraph motions: `{` moves to the previous paragraph start and `}` moves to the next paragraph.
- Added paragraph text objects: `ip` selects the current blank-line-delimited paragraph body, and `ap` includes one adjacent blank separator group.
- Paragraph motions and text objects support custom keybindings via `piVimMode.keymap.motions.paragraphBackward`, `piVimMode.keymap.motions.paragraphForward`, and `piVimMode.keymap.textObjects.targets.paragraph`.
- Updated feature/settings docs and OpenSpec coverage for paragraph behavior.

### Word-under-cursor search

- Added Vim-style `*` and `#` normal-mode search for the keyword word under the cursor.
- Reuses prompt search state, so `n` and `N` repeat correctly and search history/highlights stay consistent with `/` and `?`.
- Supports custom keybindings via `piVimMode.keymap.commands.searchWordForward` and `piVimMode.keymap.commands.searchWordBackward`.
- Insert-mode `*` and `#` still delegate to Pi text input.

### Delete-before-cursor command

- Added Vim-style `X` in normal mode to delete the character before the cursor.
- Supports counts (`3X`), dot-repeat, and named/register semantics matching `x`.
- Keeps `X` distinct from `Ctrl+X`, which still adjusts numbers.
- Supports custom keybindings via `piVimMode.keymap.commands.deleteCharBefore`.

### Case operators

- Added Vim-style `gu`, `gU`, and `g~` case operators in normal mode.
- Supports motions, text objects, doubled line forms (`gugu`, `gUgU`, `g~g~`), counts, and dot-repeat.
- Added visual `u`, `U`, and `~` for character, line, and block selections without writing registers.
- Supports custom keybindings via `piVimMode.keymap.operators.lowercase`, `uppercase`, `toggleCase`, and matching `operatorMotions` entries.

### Modal escape aliases

- Added `piVimMode.keymap.escape` for modified-key aliases that leave insert mode, visual modes, and pending Ex command-lines.
- Aliases are empty by default, reject raw text, and stay separate from normal-mode keymaps.
- Autocomplete still owns configured aliases while completion is open.

## Bug fixes

- Kept brace text objects (`i{`, `a}`, etc.) distinct from paragraph motion keys by resolving behavior through parser context.
