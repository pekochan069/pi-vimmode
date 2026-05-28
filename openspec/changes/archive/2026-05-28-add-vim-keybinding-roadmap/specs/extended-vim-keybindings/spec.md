## ADDED Requirements

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

The Vim editor SHALL support `.` to repeat the last completed supported change command at the current cursor position.

#### Scenario: Repeat character replacement

- **WHEN** the editor is in normal mode after a successful `rx` change and the user moves to another character and presses `.`
- **THEN** the character under the cursor is replaced with `x`

#### Scenario: Repeat substitution

- **WHEN** the editor is in normal mode after a successful supported substitution and the user presses `.` at another valid location
- **THEN** the same substitution command is applied at the new location

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

The change SHALL include automated tests and user-facing documentation for the new staged keybinding groups.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover counts, numeric adjustment, word-end motion, replacement, substitution, line-local character search, dot-repeat, text objects, safe no-op behavior, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: README documents roadmap keybindings

- **WHEN** the user opens the project README
- **THEN** it documents the newly supported keybindings, count behavior, repeat limitations, supported text objects, and deferred keybindings such as `/`, `?`, `n`, and `N`
