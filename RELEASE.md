# v0.4.0

## What's new

### Paragraph motions

- Added Vim paragraph motions: `{` moves to the previous paragraph start and `}` moves to the next paragraph.
- Added paragraph text objects: `ip` selects the current blank-line-delimited paragraph body, and `ap` includes one adjacent blank separator group.
- Paragraph motions and text objects support custom keybindings via `piVimMode.keymap.motions.paragraphBackward`, `piVimMode.keymap.motions.paragraphForward`, and `piVimMode.keymap.textObjects.targets.paragraph`.
- Updated feature/settings docs and OpenSpec coverage for paragraph behavior.

## Bug fixes

- Kept brace text objects (`i{`, `a}`, etc.) distinct from paragraph motion keys by resolving behavior through parser context.
