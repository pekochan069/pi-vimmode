## ADDED Requirements

### Requirement: Normal mode supports named register prefixes
The Vim editor SHALL support Vim-style `"{slot}` register prefixes in normal mode for supported yank, delete, change, and paste commands.

#### Scenario: Named register receives normal-mode yank
- **WHEN** the editor is in normal mode and the user presses `"ayy`
- **THEN** the current line is copied to named register `a`, copied to the unnamed register as linewise text, and prompt text remains unchanged

#### Scenario: Named register receives normal-mode delete
- **WHEN** the editor is in normal mode and the user presses `"add`
- **THEN** the current line is removed, copied to named register `a`, copied to the unnamed register as linewise text, and the editor remains in normal mode

#### Scenario: Named register receives operator-motion yank
- **WHEN** the editor is in normal mode and the user presses `"ayw`
- **THEN** the addressed text range is copied to named register `a`, copied to the unnamed register as characterwise text, and prompt text remains unchanged

#### Scenario: Named register receives character delete
- **WHEN** the editor is in normal mode and the user presses `"ax`
- **THEN** the character under the cursor is removed, copied to named register `a`, copied to the unnamed register as characterwise text, and the editor remains in normal mode

#### Scenario: Named register target is one-shot
- **WHEN** the editor writes text with `"ayy` and then yanks another line with `yy`
- **THEN** named register `a` keeps the first yank, the unnamed register contains the second yank, and later unprefixed paste uses the second yank

### Requirement: Visual modes support named register prefixes
The Vim editor SHALL honor `"{slot}` register prefixes for supported visual, visual-line, and visual-block yank, delete, and change operations.

#### Scenario: Characterwise visual yank targets named register
- **WHEN** the editor is in characterwise visual mode and the user presses `"ay`
- **THEN** the selected text is copied to named register `a`, copied to the unnamed register as characterwise text, visual selection clears, and the editor returns to normal mode

#### Scenario: Visual-line delete targets named register
- **WHEN** the editor is in visual-line mode with selected lines and the user presses `"ad`
- **THEN** the selected full lines are removed, copied to named register `a`, copied to the unnamed register as linewise text, visual selection clears, and the editor returns to normal mode

#### Scenario: Visual-block change targets named register
- **WHEN** the editor is in visual-block mode with a rectangular selection and the user presses `"ac`
- **THEN** the selected block slices are removed, copied to named register `a`, copied to the unnamed register as characterwise newline-joined text, visual selection clears, and the editor enters insert mode

### Requirement: Named registers paste through existing paste semantics
The Vim editor SHALL paste from a named register when `p` or `P` is preceded by a valid `"{slot}` prefix, while unprefixed paste continues to use the unnamed register.

#### Scenario: Paste characterwise named register after cursor
- **WHEN** the editor is in normal mode with named register `a` containing characterwise text and the user presses `"ap`
- **THEN** register `a` text is inserted after the cursor using existing characterwise `p` cursor placement

#### Scenario: Paste linewise named register before current line
- **WHEN** the editor is in normal mode with named register `a` containing linewise text and the user presses `"aP`
- **THEN** register `a` lines are inserted above the current line using existing linewise `P` cursor placement

#### Scenario: Missing named register paste is safe
- **WHEN** the editor is in normal mode without named register `z` and the user presses `"zp`
- **THEN** prompt text, cursor position, unnamed register, and named registers are unchanged

#### Scenario: Unprefixed paste still uses unnamed register
- **WHEN** named register `a` and the unnamed register contain different text and the user presses `p`
- **THEN** the editor pastes the unnamed register content

### Requirement: Uppercase register targets append
The Vim editor SHALL treat uppercase alphabetic register targets as append writes to the matching lowercase named register for yank, delete, and change operations.

#### Scenario: Uppercase target appends characterwise text
- **WHEN** named register `a` contains characterwise text and the user yanks characterwise text with `"Ayw`
- **THEN** named register `a` contains the previous text followed by the newly yanked text and the unnamed register contains only the newly yanked text

#### Scenario: Uppercase target appends linewise text
- **WHEN** named register `a` contains linewise text and the user yanks a line with `"Ayy`
- **THEN** named register `a` contains the previous lines followed by the newly yanked line separated by one newline boundary and the unnamed register contains only the newly yanked line

#### Scenario: Uppercase target on empty register behaves like replace
- **WHEN** named register `b` is empty and the user deletes a line with `"Bdd`
- **THEN** named register `b` contains the deleted line as linewise text and the unnamed register contains the same deleted line

#### Scenario: Uppercase paste reads lowercase register
- **WHEN** named register `a` contains text and the user presses `"Ap`
- **THEN** the editor pastes named register `a` without modifying register contents

### Requirement: Invalid register prefixes are safe
The Vim editor MUST reject unsupported register targets without inserting text or corrupting pending operator state.

#### Scenario: Unsupported register target clears prefix
- **WHEN** the editor is in normal mode and the user presses `"1`
- **THEN** prompt text, cursor position, mode, unnamed register, named registers, and pending operator state are unchanged

#### Scenario: Incomplete register prefix does not edit text
- **WHEN** the editor is in normal mode and the user presses `"` without a following slot
- **THEN** prompt text remains unchanged and the editor waits for a register target key

#### Scenario: Register prefix before unsupported command no-ops
- **WHEN** the editor is in normal mode and the user presses `"aq`
- **THEN** prompt text, cursor position, unnamed register, and named register `a` are unchanged, and the register target is cleared

### Requirement: Named edit registers stay separate from macro slots
The Vim editor SHALL keep named edit registers independent from macro recording and playback slots.

#### Scenario: Macro slot and edit register with same letter do not collide
- **WHEN** macro slot `a` contains recorded input tokens and named edit register `a` contains text
- **THEN** playing macro `@a` replays the macro tokens, while `"ap` pastes the edit-register text

#### Scenario: Writing edit register does not overwrite macro slot
- **WHEN** macro slot `a` contains recorded input tokens and the user writes text to named edit register `a`
- **THEN** macro slot `a` remains available for playback and named edit register `a` contains the written text

### Requirement: Named registers are documented and validated
The named register change SHALL include automated tests and user-facing documentation for supported slots, write behavior, paste behavior, append behavior, macro separation, and limitations.

#### Scenario: Automated validation runs
- **WHEN** `bun test` is executed
- **THEN** tests cover normal-mode register writes, visual-mode register writes, paste from named registers, uppercase append, invalid prefixes, missing registers, one-shot target clearing, and macro separation where macro support is present

#### Scenario: Typecheck runs
- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: README documents named registers
- **WHEN** the user opens the project README
- **THEN** it documents supported named register syntax, append behavior, session-local storage, unsupported special registers, and separation from macro slots
