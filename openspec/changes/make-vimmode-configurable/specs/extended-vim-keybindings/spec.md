## MODIFIED Requirements

### Requirement: Normal mode supports operator-motion editing

The Vim editor SHALL support deleting, changing, and yanking prompt ranges using the resolved operator-motion keymap. With no keymap configuration, the default operators `d`, `c`, and `y` and the default motions `w`, `b`, `0`, `^`, and `$` SHALL preserve the current documented behavior.

#### Scenario: Delete with motion

- **WHEN** the editor is in normal mode and the user presses the resolved delete operator followed by a resolved motion allowed for delete
- **THEN** the addressed text range is removed, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Change with motion

- **WHEN** the editor is in normal mode and the user presses the resolved change operator followed by a resolved motion allowed for change
- **THEN** the addressed text range is removed, copied to the unnamed character register, and the editor enters insert mode

#### Scenario: Yank with motion

- **WHEN** the editor is in normal mode and the user presses the resolved yank operator followed by a resolved motion allowed for yank
- **THEN** the addressed text range is copied to the unnamed character register without changing prompt text

#### Scenario: Default operator-motion combinations remain available

- **WHEN** no `piVimMode.keymap.operatorMotions` setting is configured
- **THEN** `d`, `c`, and `y` followed by `w`, `b`, `0`, `^`, or `$` keep their existing delete, change, and yank behavior

#### Scenario: Configured operator-motion combination is not allowed

- **WHEN** the editor is in normal mode with a pending configured operator and the user presses a configured motion omitted from that operator's resolved motion list
- **THEN** the pending operator clears, no text is inserted, and prompt text is unchanged

#### Scenario: Invalid operator combination

- **WHEN** the editor is in normal mode with pending operator `d`, `c`, or `y` and the user presses an unsupported printable key
- **THEN** the pending operator clears, no text is inserted, and prompt text is unchanged
