# extended-vim-keybindings Specification

## Purpose

TBD - created by archiving change add-more-vim-keybindings. Update Purpose after archive.

## Requirements

### Requirement: Normal mode supports additional navigation bindings

The Vim editor SHALL support additional normal-mode navigation bindings for common prompt movement.

#### Scenario: Jump to buffer start

- **WHEN** the editor is in normal mode and the user presses `gg`
- **THEN** the cursor moves to the start of the first prompt line

#### Scenario: Jump to buffer end

- **WHEN** the editor is in normal mode and the user presses `G`
- **THEN** the cursor moves to the end of the last prompt line

#### Scenario: Move to first non-blank character

- **WHEN** the editor is in normal mode and the user presses `^` or `_`
- **THEN** the cursor moves to the first non-blank character of the current line, or the line start when the line is blank

#### Scenario: Jump to matching pair

- **WHEN** the editor is in normal mode and the user presses `%` on or before a `()`, `[]`, or `{}` bracket pair on the current line
- **THEN** the cursor moves to the matching bracket when a match exists

#### Scenario: Matching pair not found

- **WHEN** the editor is in normal mode and the user presses `%` without a supported bracket at or after the cursor on the current line, or without a matching bracket
- **THEN** prompt text and cursor position are unchanged

### Requirement: Normal mode supports line opening bindings

The Vim editor SHALL support Vim line-opening commands that enter insert mode after creating a blank line.

#### Scenario: Open line below

- **WHEN** the editor is in normal mode and the user presses `o`
- **THEN** a blank line is inserted below the current line, the cursor moves to that blank line, and the editor enters insert mode

#### Scenario: Open line above

- **WHEN** the editor is in normal mode and the user presses `O`
- **THEN** a blank line is inserted above the current line, the cursor moves to that blank line, and the editor enters insert mode

#### Scenario: Open line in empty prompt

- **WHEN** the editor is in normal mode with an empty prompt and the user presses `o` or `O`
- **THEN** the prompt remains editable with the cursor on a blank line in insert mode

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

### Requirement: Normal mode supports line command aliases

The Vim editor SHALL support common line-editing aliases for delete, change, yank, and join operations.

#### Scenario: Delete to line end

- **WHEN** the editor is in normal mode and the user presses `D`
- **THEN** text from the cursor through the end of the current line is removed and copied to the unnamed character register

#### Scenario: Change to line end

- **WHEN** the editor is in normal mode and the user presses `C`
- **THEN** text from the cursor through the end of the current line is removed, copied to the unnamed character register, and the editor enters insert mode

#### Scenario: Yank current line with alias

- **WHEN** the editor is in normal mode and the user presses `Y`
- **THEN** the current line is copied to the unnamed line register without changing prompt text

#### Scenario: Change current line

- **WHEN** the editor is in normal mode and the user presses `cc`
- **THEN** the current line is removed into the unnamed line register and the editor enters insert mode on an editable line

#### Scenario: Join current line with next line

- **WHEN** the editor is in normal mode and the user presses `J` while a next line exists
- **THEN** the current line and next line are joined into one line using a single separating space when needed

#### Scenario: Join last line

- **WHEN** the editor is in normal mode and the user presses `J` on the last prompt line
- **THEN** prompt text is unchanged and the editor remains in normal mode

### Requirement: Normal mode supports paste before

The Vim editor SHALL support pasting the unnamed register before the current cursor or current line.

#### Scenario: Paste character register before cursor

- **WHEN** the editor is in normal mode with a characterwise unnamed register and the user presses `P`
- **THEN** register text is inserted before the cursor and the cursor moves to the pasted text

#### Scenario: Paste line register before current line

- **WHEN** the editor is in normal mode with a linewise unnamed register and the user presses `P`
- **THEN** register lines are inserted above the current line and the cursor moves to the first pasted line

#### Scenario: Paste before with empty register

- **WHEN** the editor is in normal mode without an unnamed register and the user presses `P`
- **THEN** prompt text is unchanged and the editor remains in normal mode

### Requirement: Extended keybindings are documented and validated

The change SHALL include tests and documentation for each new keybinding group.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover navigation, matching-pair jumps, open-line commands, operator-motion commands, line aliases, paste-before behavior, invalid pending operators, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: README documents extended keymap

- **WHEN** the user opens the project README
- **THEN** it documents the added normal-mode commands, supported operator-motion combinations, and current limitations
