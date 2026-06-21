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

#### Scenario: Feature guide documents extended keymap

- **WHEN** the user opens `docs/features.md`
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

The change SHALL include automated tests and user-facing documentation for the new staged keybinding groups and SHALL keep canonical feature-guide limitations aligned with supported keybinding behavior.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover counts, numeric adjustment, word-end motion, replacement, substitution, line-local character search, dot-repeat, text objects, safe no-op behavior, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents roadmap keybindings

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents the newly supported keybindings, count behavior, repeat limitations, supported text objects, supported prompt search keys such as `/`, `n`, and `N`, and still-deferred keybindings such as `?`

#### Scenario: Feature guide limitations do not contradict supported keybindings

- **WHEN** the user reads `docs/features.md` limitations
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

### Requirement: Normal mode supports line shift operators

The Vim editor SHALL support finite line-only indent and dedent shift operators in normal mode.

#### Scenario: Indent current line

- **WHEN** the editor is in normal mode and the user presses `>>`
- **THEN** two spaces are added to the start of the current prompt line, the editor remains in normal mode, and no register is written

#### Scenario: Dedent current line

- **WHEN** the editor is in normal mode and the user presses `<<` on a line that starts with indentation
- **THEN** at most one tab, two spaces, or one leading space is removed from that line, the editor remains in normal mode, and no register is written

#### Scenario: Dedent unindented line is safe

- **WHEN** the editor is in normal mode and the user presses `<<` on a line without leading indentation
- **THEN** prompt text and registers remain unchanged and the editor remains in normal mode

#### Scenario: Counted indent shifts consecutive lines

- **WHEN** the editor is in normal mode and the user presses `3>>`
- **THEN** the current line and the next two prompt lines, when present, are indented using the same two-space transform as `:indent`

#### Scenario: Counted dedent shifts available lines

- **WHEN** the editor is in normal mode and the user presses `2<<` near the end of the prompt
- **THEN** the current line and the next available prompt line are dedented using the same transform as `:dedent`, clamped to the prompt length

#### Scenario: Dot repeat repeats normal line shift

- **WHEN** a normal-mode `>>` or `<<` command successfully changes prompt text and the user later presses `.` in normal mode
- **THEN** the same shift action and count are applied again at the current cursor line

#### Scenario: Unsupported shift target is safe

- **WHEN** the editor is in normal mode with a pending shift operator and the user enters an unsupported target such as `w`, `iw`, `/query`, or a mark jump
- **THEN** the pending operator clears, prompt text is unchanged, registers are unchanged, and the unmatched key is not inserted into the prompt

### Requirement: Visual modes support selected line shifts

The Vim editor SHALL support indenting and dedenting all prompt lines touched by the active visual selection.

#### Scenario: Visual character selection indents touched lines

- **WHEN** the editor is in visual character mode with a selection that touches one or more prompt lines and the user presses `>`
- **THEN** every touched line is indented using the same two-space transform as `:indent`, the selection clears, and the editor returns to normal mode

#### Scenario: Visual line selection dedents selected lines

- **WHEN** the editor is in visual line mode with one or more lines selected and the user presses `<`
- **THEN** every selected line is dedented using the same transform as `:dedent`, the selection clears, and the editor returns to normal mode

#### Scenario: Visual block selection shifts touched lines

- **WHEN** the editor is in visual block mode with a rectangular selection and the user presses `>` or `<`
- **THEN** every line touched by the block selection is shifted, regardless of the selected columns, and the editor returns to normal mode

#### Scenario: Counted visual shift changes depth

- **WHEN** the editor is in visual mode with one or more lines selected and the user presses `2>`
- **THEN** every touched line is indented by two shift levels using the same two-space transform as `:indent` applied twice

#### Scenario: Visual shift does not write registers

- **WHEN** a visual `>` or `<` command changes prompt text
- **THEN** unnamed and named registers remain unchanged by the shift command

### Requirement: Shift operators are documented and validated

The change SHALL include automated validation and user documentation for normal and visual shift operators.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover normal `>>` and `<<`, counts, dot-repeat, visual character/line/block shifts, unsupported shift targets, register preservation, and existing delete/change/yank behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents shift operators

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `>>`, `<<`, counted line shifts, visual `>` and `<`, transform semantics, and the current limitation that arbitrary `>{motion}` and `<{motion}` are unsupported

### Requirement: Operators support line-local character search targets

The Vim editor SHALL allow motion-capable normal-mode operators to target current-line character search commands using the resolved `findCharForward`, `findCharBackward`, `tillCharForward`, and `tillCharBackward` bindings.

#### Scenario: Delete through forward character search target

- **WHEN** the editor is in normal mode and the user presses `df)` while a later `)` exists on the current line
- **THEN** text from the cursor through that `)` is removed, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Delete until forward character search target

- **WHEN** the editor is in normal mode and the user presses `dt,` while a later `,` exists on the current line after at least one intervening character
- **THEN** text from the cursor up to but not including that `,` is removed, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Change through backward character search target

- **WHEN** the editor is in normal mode and the user presses `cF:` while an earlier `:` exists on the current line
- **THEN** text from that `:` through the cursor is removed, copied to the unnamed character register, and the editor enters insert mode at the removed range start

#### Scenario: Yank until backward character search target

- **WHEN** the editor is in normal mode and the user presses `yT[` while an earlier `[` exists on the current line before at least one intervening character
- **THEN** text after that `[` through the cursor is copied to the unnamed character register without changing prompt text or mode

#### Scenario: Counted operator character search target

- **WHEN** the editor is in normal mode and the user presses `d2f,` while at least two later `,` characters exist on the current line
- **THEN** text from the cursor through the second later `,` is removed and copied to the unnamed character register

#### Scenario: Empty till range is safe

- **WHEN** the editor is in normal mode and the user presses `dt,` while the next character is `,`
- **THEN** prompt text, cursor position, registers, and mode are unchanged, and pending operator state clears

#### Scenario: Missing character search target is safe

- **WHEN** the editor is in normal mode with a pending delete, change, or yank operator and the requested character search target does not exist in the addressed direction on the current line
- **THEN** prompt text, cursor position, registers, and mode are unchanged, and pending operator state clears

#### Scenario: Successful operator character search updates repeat state

- **WHEN** a delete or change operator successfully uses a character search target and the user later presses `.` in normal mode at another valid location
- **THEN** the same operator character-search change is applied again using the recorded target command and character

#### Scenario: Successful operator character search updates last character search

- **WHEN** an operator successfully uses `f`, `F`, `t`, or `T` with a target character
- **THEN** subsequent `;` and `,` commands repeat that character search using the same rules as a normal-mode character search

#### Scenario: Operators target repeated character search

- **WHEN** a previous character search exists and the user presses `d;`, `c,`, or `y;` in normal mode
- **THEN** the operator uses the repeated character-search target, with delete/change writing the unnamed character register and change entering insert mode on a changed range

### Requirement: Operators support range-safe normal motions

The Vim editor SHALL allow motion-capable normal-mode operators to target every supported normal motion with finite range semantics: `h`, `j`, `k`, `l`, `w`, `b`, `e`, `W`, `B`, `E`, `ge`, `gE`, `0`, `^`, `$`, `gg`, `G`, and `%`.

#### Scenario: Characterwise horizontal operator motions

- **WHEN** the editor is in normal mode and the user presses `dl` or `dh`
- **THEN** the addressed characterwise range is removed and copied to the unnamed character register without involving raw adapter movement

#### Scenario: Linewise vertical and buffer operator motions

- **WHEN** the editor is in normal mode and the user presses `dj`, `dk`, `dgg`, or `dG`
- **THEN** the addressed whole-line range is removed and copied to the unnamed line register

#### Scenario: Matching-pair operator motion

- **WHEN** the editor is in normal mode and the user presses `d%` while the cursor is on a matched pair delimiter
- **THEN** the text through the matching delimiter is removed and copied to the unnamed character register

#### Scenario: WORD operator motion

- **WHEN** the editor is in normal mode and the user presses `dW`, `cE`, or `yB` with an addressed WORD target available
- **THEN** the operator applies to the finite whitespace-delimited WORD range, delete and change write the unnamed character register, change enters insert mode after a changed range, and yank leaves prompt text unchanged

#### Scenario: Previous-end operator motion

- **WHEN** the editor is in normal mode and the user presses `dge` or `ygE` with an addressed previous word end available
- **THEN** the operator applies to the finite characterwise range between the cursor and the resolved previous word or WORD end

#### Scenario: Count after operator applies to supported motions

- **WHEN** the editor is in normal mode and the user presses `d2w`, `d2W`, `d2ge`, `d2j`, or `d2;`
- **THEN** the after-operator count is applied to that finite operator target

### Requirement: Normal and visual modes support WORD and previous-end word motions

The Vim editor SHALL support explicit whitespace-delimited WORD motions and previous-end word motions in prompt-local normal and visual modes while preserving current lowercase word motion behavior.

#### Scenario: WORD motions move across whitespace-delimited tokens

- **WHEN** the editor is in normal mode with prompt text `run --foo=bar /tmp/a-b` and the cursor starts on `run`
- **THEN** pressing `W` moves to the start of `--foo=bar`, pressing `E` from that token moves to the token end, and pressing `B` from `/tmp/a-b` moves back to the start of `--foo=bar`

#### Scenario: Previous-end motions move to earlier word ends

- **WHEN** the editor is in normal mode with prompt text `alpha beta.gamma /tmp/file` and the cursor is at the start of `/tmp/file`
- **THEN** pressing `ge` moves to the previous lowercase word end using the existing lowercase word boundaries, and pressing `gE` moves to the previous WORD end using whitespace-delimited WORD boundaries

#### Scenario: Counted WORD and previous-end motions repeat targets

- **WHEN** the editor is in normal mode with multiple prompt tokens available in the addressed direction
- **THEN** pressing `2W`, `2B`, `2E`, `2ge`, or `2gE` applies the addressed motion twice or stops at the prompt boundary when no further target exists

#### Scenario: Missing WORD or previous-end target is safe

- **WHEN** the editor is in normal mode and a WORD or previous-end motion has no target in the addressed direction
- **THEN** prompt text, registers, mode, and cursor position remain unchanged except for existing invalidation or no-op feedback behavior

#### Scenario: Visual selection extends with WORD and previous-end motions

- **WHEN** the editor is in visual character mode with an active selection
- **THEN** pressing `W`, `B`, `E`, `ge`, or `gE` moves the active end of the selection using the same prompt-local target semantics as normal mode

### Requirement: Normal and visual modes support half-page scroll motions

The Vim editor SHALL support prompt-local half-page scroll motions that move the cursor through long prompts and rely on existing cursor-driven rendering to reveal the new location.

#### Scenario: Half-page scrolls down in normal mode

- **WHEN** the editor is in normal mode with a multi-line prompt and the user presses `<C-d>`
- **THEN** the cursor moves down by the resolved half-page amount, clamped to the last prompt line

#### Scenario: Half-page scrolls up in normal mode

- **WHEN** the editor is in normal mode with a multi-line prompt and the user presses `<C-u>`
- **THEN** the cursor moves up by the resolved half-page amount, clamped to the first prompt line

#### Scenario: Count multiplies scroll amount

- **WHEN** the editor is in normal mode and the user presses `2<C-d>` or `2<C-u>`
- **THEN** the cursor moves by two resolved half-page amounts in the requested direction, clamped to prompt bounds

#### Scenario: Boundary scroll is safe

- **WHEN** the editor is in normal mode at the first prompt line and presses `<C-u>`, or at the last prompt line and presses `<C-d>`
- **THEN** prompt text, registers, marks, search highlights, and mode remain unchanged except for any cursor clamping required by the prompt bounds

#### Scenario: Visual scroll extends selection

- **WHEN** the editor is in visual, visual-line, or visual-block mode and the user presses `<C-d>` or `<C-u>`
- **THEN** the visual anchor remains unchanged and the active cursor moves by the resolved scroll motion

### Requirement: Scroll keybindings are documented and validated

The implementation SHALL include automated validation and user-facing documentation for scroll-style keybindings.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default `<C-d>` and `<C-u>` behavior, counts, prompt-boundary clamping, visual selection behavior, and existing normal-mode behavior

#### Scenario: Feature guide documents scroll keys

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `<C-d>` and `<C-u>` as prompt-local half-page scroll motions and states deferred Vim scroll features such as `<C-f>`, `<C-b>`, `zz`, `zt`, and `zb`

#### Scenario: Runtime keybinding discovery lists scroll motions

- **WHEN** runtime keybinding discovery shows supported motion keys
- **THEN** `<C-d>` and `<C-u>` appear with descriptions matching their prompt-local half-page scroll behavior

### Requirement: Normal and visual modes support paragraph motions

The Vim editor SHALL support prompt-local paragraph motions using blank-line-separated paragraph runs while preserving finite prompt-editing scope.

#### Scenario: Forward paragraph motion moves to next paragraph

- **WHEN** the editor is in normal mode with the cursor inside a nonblank paragraph and the user presses `}` while a later paragraph exists
- **THEN** the cursor moves to the first column of the next paragraph's first nonblank line

#### Scenario: Forward paragraph motion reaches prompt end

- **WHEN** the editor is in normal mode with the cursor inside the last nonblank paragraph and the user presses `}`
- **THEN** the cursor moves to the end of the prompt or remains there when already at the prompt end

#### Scenario: Backward paragraph motion moves to paragraph start

- **WHEN** the editor is in normal mode with the cursor inside a nonblank paragraph and the user presses `{`
- **THEN** the cursor moves to the first column of the current paragraph, or to the previous paragraph start when already at the current paragraph start

#### Scenario: Counted paragraph motion repeats targets

- **WHEN** the editor is in normal mode and the user presses `2}` or `2{`
- **THEN** the paragraph motion repeats twice and clamps safely at the prompt boundary when fewer paragraph targets exist

#### Scenario: Visual paragraph motion extends selection

- **WHEN** the editor is in visual character, visual line, or visual block mode with an active selection and the user presses `{` or `}`
- **THEN** the visual anchor remains unchanged and the active cursor moves using the same paragraph target semantics as normal mode

### Requirement: Operators support paragraph motions and paragraph text objects

The Vim editor SHALL allow motion-capable operators to target paragraph motions and SHALL support paragraph text objects with `ip` and `ap` defaults.

#### Scenario: Delete by forward paragraph motion

- **WHEN** the editor is in normal mode inside a paragraph and the user presses `d}`
- **THEN** text from the cursor through the resolved forward paragraph boundary is removed, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Change by backward paragraph motion

- **WHEN** the editor is in normal mode inside a paragraph and the user presses `c{`
- **THEN** text from the resolved backward paragraph boundary through the cursor is removed, copied to the unnamed character register, and the editor enters insert mode at the removed range start

#### Scenario: Yank by paragraph motion preserves prompt text

- **WHEN** the editor is in normal mode inside a paragraph and the user presses `y}` or `y{`
- **THEN** the addressed paragraph-motion range is copied to the unnamed character register without changing prompt text or mode

#### Scenario: Delete inner paragraph

- **WHEN** the editor is in normal mode with the cursor inside a nonblank paragraph and the user presses `dip`
- **THEN** the paragraph body is removed without adjacent blank separator lines, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Delete around paragraph

- **WHEN** the editor is in normal mode with the cursor inside a nonblank paragraph and the user presses `dap`
- **THEN** the paragraph body plus one adjacent blank separator group when present is removed and copied to the unnamed character register

#### Scenario: Missing paragraph text object is safe

- **WHEN** the editor is in normal mode on an empty prompt or only whitespace separator lines and the user presses `dip` or `dap`
- **THEN** prompt text, cursor position, registers, and mode are unchanged, and pending operator state clears

#### Scenario: Paragraph changes are repeatable

- **WHEN** a delete or change paragraph motion or paragraph text-object command changes prompt text and the user later presses `.` in normal mode at another valid paragraph location
- **THEN** the same supported paragraph change is applied at the new location using the recorded operation and count

### Requirement: Paragraph keybindings are documented and validated

The change SHALL include automated validation and user-facing documentation for paragraph motions and paragraph text objects.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover paragraph motions, counts, operator paragraph motions, paragraph text objects, visual extension, safe no-op behavior, dot-repeat for paragraph changes, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents paragraph behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `{` / `}` paragraph motions, `ip` / `ap` paragraph text objects, blank-line-only paragraph semantics, supported operator usage, and non-goals compared with full Vim paragraph grammar

### Requirement: Normal mode supports delete before cursor

The Vim editor SHALL support `X` in normal mode as a prompt-local delete-before-cursor command.

#### Scenario: Delete character before cursor

- **WHEN** the editor is in normal mode with the cursor after at least one character on the current line and the user presses `X`
- **THEN** the character immediately before the cursor is deleted, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Counted delete before cursor

- **WHEN** the editor is in normal mode with characters before the cursor and the user presses `3X`
- **THEN** up to three characters immediately before the cursor on the current line are deleted, copied to the unnamed character register in prompt order, and the editor remains in normal mode

#### Scenario: Delete before cursor at line start is safe

- **WHEN** the editor is in normal mode with the cursor at the start of a line and the user presses `X`
- **THEN** prompt text is unchanged, the unnamed register is unchanged, and the editor remains in normal mode

#### Scenario: Delete before cursor does not cross line boundary

- **WHEN** the editor is in normal mode with the cursor near the start of a line and the user presses a count larger than the number of characters before the cursor on that line followed by `X`
- **THEN** only characters before the cursor on the current line are deleted and no previous line text is removed

#### Scenario: Delete before cursor remains distinct from numeric decrement

- **WHEN** the editor is in normal mode and the user presses `X`
- **THEN** the editor runs delete-before-cursor behavior instead of `Ctrl+X` numeric decrement behavior

### Requirement: Delete-before-cursor behavior is documented and validated

The implementation SHALL include focused tests and user-facing documentation for `X`.

#### Scenario: Automated validation covers delete before cursor

- **WHEN** `bun test` is executed
- **THEN** tests cover normal, counted, line-start no-op, register, and dot-repeat behavior for `X`

#### Scenario: Feature guide documents delete before cursor

- **WHEN** the user opens `docs/features.md`
- **THEN** the normal-mode keymap documents `X` as delete character before cursor

### Requirement: Normal mode supports case operators

The Vim editor SHALL support finite prompt-local case operators for lowercasing, uppercasing, and toggling case across supported normal-mode ranges.

#### Scenario: Lowercase by motion

- **WHEN** the editor is in normal mode with mixed-case text under the cursor and the user presses `guw`
- **THEN** the addressed word range is lowercased, the editor remains in normal mode, and unnamed and named registers are unchanged

#### Scenario: Uppercase text object

- **WHEN** the editor is in normal mode with the cursor inside a word and the user presses `gUiw`
- **THEN** the inner word text object is uppercased, the editor remains in normal mode, and registers are unchanged

#### Scenario: Toggle current line

- **WHEN** the editor is in normal mode and the user presses `g~g~`
- **THEN** the current prompt line has letter case toggled, the editor remains in normal mode, and registers are unchanged

#### Scenario: Counted case operator applies to finite target

- **WHEN** the editor is in normal mode and the user presses `2guw` with two word ranges available
- **THEN** the addressed finite range is lowercased and the cursor is restored to the start of the changed range

#### Scenario: Missing case target is safe

- **WHEN** the editor is in normal mode with a pending case operator and the requested motion or text object target does not exist
- **THEN** prompt text, cursor position, registers, and mode are unchanged, and pending operator state clears

#### Scenario: Case operator is repeatable

- **WHEN** a normal-mode case operator changes prompt text and the user later presses `.` in normal mode at another valid target
- **THEN** the same case operator target is applied at the new cursor position

### Requirement: Visual modes support selected case transforms

The Vim editor SHALL support prompt-local lower, upper, and toggle case transforms for active visual selections.

#### Scenario: Visual character selection lowercases selected text

- **WHEN** the editor is in visual character mode with selected mixed-case text and the user presses `u`
- **THEN** only the selected character range is lowercased, visual selection clears, the editor returns to normal mode, and registers are unchanged

#### Scenario: Visual line selection uppercases selected lines

- **WHEN** the editor is in visual line mode with one or more selected lines and the user presses `U`
- **THEN** all selected lines are uppercased, visual selection clears, the editor returns to normal mode, and registers are unchanged

#### Scenario: Visual block selection toggles selected cells

- **WHEN** the editor is in visual block mode with a rectangular selection and the user presses `~`
- **THEN** only selected block cells have letter case toggled, visual selection clears, the editor returns to normal mode, and registers are unchanged

#### Scenario: Non-letter and expanding case mappings stay safe

- **WHEN** a case transform range includes non-letter characters or characters whose JavaScript case mapping expands to multiple code points
- **THEN** those characters remain width-safe and prompt text outside one-code-point case mappings is unchanged

### Requirement: Case operators are documented and validated

The implementation SHALL include automated validation and user-facing documentation for normal and visual case transforms.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover normal case operators, motion targets, text-object targets, line targets, counts, visual character/line/block transforms, safe no-op behavior, register preservation, dot-repeat, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents case behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `gu`, `gU`, `g~`, visual `u` / `U` / `~`, supported targets, register behavior, repeat behavior, and non-goals compared with full Vim case grammar
