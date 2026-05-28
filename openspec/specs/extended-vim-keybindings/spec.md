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

### Requirement: Normal mode supports counted commands

The Vim editor SHALL support Vim-style numeric count prefixes for supported normal-mode commands, motions, and operator targets while preserving `0` as line-start when no count is pending.

#### Scenario: Counted motion repeats movement

- **WHEN** the editor is in normal mode and the user presses `3w`
- **THEN** the cursor moves forward by three word-forward motions or until no further movement is possible

#### Scenario: Counted line command repeats line operation

- **WHEN** the editor is in normal mode and the user presses `2dd`
- **THEN** two prompt lines are removed when available, copied to the unnamed line register, and the editor remains in normal mode

#### Scenario: Zero without pending count remains line start

- **WHEN** the editor is in normal mode with no pending numeric count and the user presses `0`
- **THEN** the cursor moves to the current line start

#### Scenario: Count before unsupported command is safe

- **WHEN** the editor is in normal mode with a pending numeric count and the user presses an unsupported printable key
- **THEN** the pending count clears, no text is inserted, and prompt text is unchanged

### Requirement: Normal mode supports numeric adjustment

The Vim editor SHALL support normal-mode numeric increment and decrement using `Ctrl+A` and `Ctrl+X`, with counts applying as the adjustment amount.

#### Scenario: Increment number under cursor

- **WHEN** the editor is in normal mode with the cursor on or before a supported number in the current line and the user presses `Ctrl+A`
- **THEN** that number is incremented by one and the editor remains in normal mode

#### Scenario: Decrement number by count

- **WHEN** the editor is in normal mode with the cursor on or before a supported number in the current line and the user presses `5` followed by `Ctrl+X`
- **THEN** that number is decremented by five and the editor remains in normal mode

#### Scenario: No number is safe

- **WHEN** the editor is in normal mode and no supported number exists at or after the cursor on the current line
- **THEN** pressing `Ctrl+A` or `Ctrl+X` leaves prompt text and cursor position unchanged

### Requirement: Normal mode supports word-end motion and small substitutions

The Vim editor SHALL support `e` as a word-end motion and SHALL support `r{char}`, `s`, and `S` as normal-mode edit commands.

#### Scenario: Word-end motion moves to end of word

- **WHEN** the editor is in normal mode and the user presses `e`
- **THEN** the cursor moves to the end of the current or next word when one exists

#### Scenario: Word-end motion works after operator

- **WHEN** the editor is in normal mode and the user presses `d` followed by `e`
- **THEN** text from the cursor through the addressed word end is removed, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Replace character stays in normal mode

- **WHEN** the editor is in normal mode with the cursor on a character and the user presses `r` followed by `x`
- **THEN** the character under the cursor is replaced with `x` and the editor remains in normal mode

#### Scenario: Substitute character enters insert mode

- **WHEN** the editor is in normal mode with the cursor on a character and the user presses `s`
- **THEN** the character under the cursor is removed, copied to the unnamed character register, and the editor enters insert mode at that position

#### Scenario: Substitute line enters insert mode

- **WHEN** the editor is in normal mode and the user presses `S`
- **THEN** the current line is removed into the unnamed line register and the editor enters insert mode on an editable line

### Requirement: Normal mode supports line-local character search

The Vim editor SHALL support line-local character search commands `f`, `F`, `t`, and `T`, and SHALL support `;` and `,` to repeat the last successful character search forward or backward.

#### Scenario: Find next character on current line

- **WHEN** the editor is in normal mode and the user presses `f:` while a later `:` exists on the current line
- **THEN** the cursor moves to that `:` character

#### Scenario: Till next character stops before match

- **WHEN** the editor is in normal mode and the user presses `t:` while a later `:` exists on the current line
- **THEN** the cursor moves to the character before that `:` when such a position exists

#### Scenario: Repeat last character search

- **WHEN** the editor has a successful prior character search and the user presses `;`
- **THEN** the search repeats in the same effective direction from the current cursor position

#### Scenario: Reverse repeat last character search

- **WHEN** the editor has a successful prior character search and the user presses `,`
- **THEN** the search repeats in the opposite effective direction from the current cursor position

#### Scenario: Missing character search target is safe

- **WHEN** the editor is in normal mode and the user searches for a character that does not exist in the addressed direction on the current line
- **THEN** prompt text is unchanged and the cursor remains unchanged

### Requirement: Normal mode repeats completed changes

The Vim editor SHALL support `.` to repeat the last completed supported change command at the current cursor position, including documented line edit commands that changed the prompt.

#### Scenario: Repeat character replacement

- **WHEN** the editor is in normal mode after a successful `rx` change and the user moves to another character and presses `.`
- **THEN** the character under the cursor is replaced with `x`

#### Scenario: Repeat substitution

- **WHEN** the editor is in normal mode after a successful supported substitution and the user presses `.` at another valid location
- **THEN** the same substitution command is applied at the new location

#### Scenario: Repeat line delete

- **WHEN** the editor is in normal mode after a successful `dd` or counted `dd` change and the user presses `.` at another valid line
- **THEN** the same line delete command is applied at the new location and updates the unnamed line register

#### Scenario: Repeat line change

- **WHEN** the editor is in normal mode after a successful `cc` or `S` change returns to normal mode and the user presses `.` at another valid line
- **THEN** the same line change command is applied at the new location and the editor enters insert mode

#### Scenario: Repeat with no prior change is safe

- **WHEN** the editor is in normal mode and no repeatable change has completed
- **THEN** pressing `.` leaves prompt text, cursor position, registers, and mode unchanged

#### Scenario: Unsupported prior action is not repeated

- **WHEN** the most recent handled action is not a supported repeatable change
- **THEN** pressing `.` leaves prompt text, cursor position, registers, and mode unchanged

### Requirement: Operators support prompt text objects

The Vim editor SHALL support operator targets for inner word, around word, quote text objects, and bracket text objects.

#### Scenario: Change inner word

- **WHEN** the editor is in normal mode with the cursor inside a word and the user presses `ciw`
- **THEN** the word contents are removed, copied to the unnamed character register, and the editor enters insert mode

#### Scenario: Delete around word

- **WHEN** the editor is in normal mode with the cursor inside or adjacent to a word and the user presses `daw`
- **THEN** the word plus its text-object boundary whitespace is removed and copied to the unnamed character register

#### Scenario: Change inner quotes

- **WHEN** the editor is in normal mode with the cursor inside a double-quoted phrase and the user presses `ci"`
- **THEN** the quoted contents are removed, the surrounding quote characters remain, the removed text is copied to the unnamed character register, and the editor enters insert mode

#### Scenario: Yank around brackets

- **WHEN** the editor is in normal mode with the cursor inside a parenthesized, bracketed, or braced range and the user presses the yank operator followed by the matching around-object target
- **THEN** the enclosing delimiters and contents are copied to the unnamed character register without changing prompt text

#### Scenario: Missing text object target is safe

- **WHEN** the editor is in normal mode with a pending operator and the requested text object does not exist around the cursor
- **THEN** prompt text, cursor position, registers, and mode are unchanged, and pending operator state clears

### Requirement: Roadmap keybindings are documented and validated

The change SHALL include automated tests and user-facing documentation for the new staged keybinding groups and SHALL keep README limitations aligned with supported keybinding behavior.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover counts, numeric adjustment, word-end motion, replacement, substitution, line-local character search, dot-repeat, text objects, safe no-op behavior, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: README documents roadmap keybindings

- **WHEN** the user opens the project README
- **THEN** it documents the newly supported keybindings, count behavior, repeat limitations, supported text objects, and deferred keybindings such as `/`, `?`, `n`, and `N`

#### Scenario: README limitations do not contradict supported keybindings

- **WHEN** the user reads README limitations
- **THEN** the limitations do not list counts, text objects, line-local character search, or other supported roadmap keybindings as unsupported

### Requirement: Prompt search commands update highlight state

The Vim editor SHALL update visible search-highlight state after successful prompt search commands when search highlighting is enabled.

#### Scenario: Slash search updates highlights
- **WHEN** the editor is in normal mode and the user completes `/query<Enter>` with at least one literal prompt match
- **THEN** the cursor moves to the next match and visible search highlights reflect the query and current match

#### Scenario: Repeat search updates current highlight
- **WHEN** the editor has visible search highlights and the user presses `n`
- **THEN** the cursor moves according to the existing repeat-search semantics and the current-match highlight moves to the new match

#### Scenario: Reverse repeat search updates current highlight
- **WHEN** the editor has visible search highlights and the user presses `N`
- **THEN** the cursor moves according to the existing reverse-repeat semantics and the current-match highlight moves to the new match

#### Scenario: Missing search match does not replace highlights
- **WHEN** the editor has visible search highlights and a new `/query<Enter>` finds no match
- **THEN** prompt text and cursor position are unchanged and previous visible search highlights are not replaced

#### Scenario: Operator search does not render deleted text highlights
- **WHEN** a delete or change operator consumes `/query<Enter>` as a motion and changes prompt text
- **THEN** prompt text changes according to operator-search semantics and visible highlights clear or update only when still valid for remaining prompt text

