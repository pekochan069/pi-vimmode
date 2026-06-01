## ADDED Requirements

### Requirement: Ex command-line supports finite non-substitution commands

The Vim editor SHALL parse and execute a finite set of non-substitution Ex commands while preserving existing Ex substitution behavior.

#### Scenario: Supported command aliases execute

- **WHEN** the editor executes supported aliases `:d`, `:delete`, `:y`, `:yank`, `:pu`, `:put`, `:t`, `:copy`, `:m`, `:move`, `:j`, `:join`, `:noh`, or `:nohlsearch` with valid arguments
- **THEN** the command executes according to its prompt-buffer Ex semantics and exits Ex command-line mode

#### Scenario: Unsupported command is rejected

- **WHEN** the editor executes unsupported Ex commands such as `:write`, `:print`, `:global/foo/delete`, or an unsupported abbreviation such as `:co$`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

#### Scenario: Unexpected trailing arguments are rejected

- **WHEN** the editor executes an Ex command with unsupported trailing arguments such as `:delete a` or `:join!`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

### Requirement: Ex delete and yank operate on addressed prompt-buffer lines

The Vim editor SHALL support Ex delete and yank commands over Ex ranges using linewise unnamed-register semantics.

#### Scenario: Delete current line by default

- **WHEN** the editor executes `:delete` from normal mode with the cursor on prompt line 2
- **THEN** prompt line 2 is removed, the removed line is written to the unnamed register as linewise text, the cursor moves to the first remaining line at the deletion point, and the Ex row reports `1 line deleted`

#### Scenario: Delete numeric range

- **WHEN** the editor executes `:2,4d` in a prompt with at least four lines
- **THEN** prompt lines 2 through 4 are removed, those lines are written to the unnamed register as linewise text, and the Ex row reports `3 lines deleted`

#### Scenario: Yank percent range

- **WHEN** the editor executes `:%yank`
- **THEN** every prompt line is copied to the unnamed register as linewise text, prompt text and cursor position remain unchanged, and the Ex row reports the number of yanked lines

#### Scenario: Visual range delete uses captured selected lines

- **WHEN** Ex command-line mode was opened from a visual selection and the editor executes `:'<,'>delete`
- **THEN** only the prompt-buffer lines touched by the captured visual selection are removed and written to the unnamed register as linewise text

#### Scenario: Invalid range rejects delete and yank

- **WHEN** the editor executes `:999delete` or `:5,3yank`
- **THEN** the editor reports an Ex range error, prompt text remains unchanged, and registers remain unchanged

### Requirement: Ex put inserts unnamed register text as lines

The Vim editor SHALL support Ex put commands that insert unnamed register text as prompt-buffer lines after the addressed range.

#### Scenario: Put linewise register after current line

- **WHEN** the unnamed register contains linewise text and the editor executes `:put` with the cursor on prompt line 2
- **THEN** the register lines are inserted after prompt line 2, the cursor moves to the first inserted line, and the Ex row reports the number of inserted lines

#### Scenario: Put after addressed range end

- **WHEN** the unnamed register contains linewise text and the editor executes `:2,4pu`
- **THEN** the register lines are inserted after prompt line 4

#### Scenario: Put characterwise register as lines

- **WHEN** the unnamed register contains characterwise text with newline separators and the editor executes `:put`
- **THEN** the register text is split on newlines and inserted as prompt-buffer lines after the addressed line

#### Scenario: Empty register put is rejected

- **WHEN** the unnamed register is missing or empty and the editor executes `:put`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

### Requirement: Ex copy and move use destination addresses

The Vim editor SHALL support Ex copy and move commands that apply an addressed line range relative to a single destination address.

#### Scenario: Copy range after destination line

- **WHEN** the editor executes `:2,3copy$` in a prompt with at least three lines
- **THEN** prompt lines 2 through 3 are duplicated after the last prompt line, cursor position is clamped to a valid prompt position, and the Ex row reports `2 lines copied`

#### Scenario: Copy range before first line with destination zero

- **WHEN** the editor executes `:2t0` in a prompt with at least two lines
- **THEN** prompt line 2 is duplicated before prompt line 1

#### Scenario: Move range after destination line

- **WHEN** the editor executes `:4move1` in a prompt with at least four lines
- **THEN** prompt line 4 is removed from its original location and inserted after prompt line 1, visible search highlights clear if prompt text changed, and the Ex row reports `1 line moved`

#### Scenario: Move range before first line with destination zero

- **WHEN** the editor executes `:3,4m0` in a prompt with at least four lines
- **THEN** prompt lines 3 through 4 move before prompt line 1 while preserving their order

#### Scenario: Move destination inside moved range is rejected

- **WHEN** the editor executes `:2,4move3`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

#### Scenario: Missing destination is rejected

- **WHEN** the editor executes `:2copy` or `:2move`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

#### Scenario: Destination zero is not a range address

- **WHEN** the editor executes `:0delete`
- **THEN** the editor reports an Ex range error and prompt text remains unchanged

### Requirement: Ex join combines addressed prompt-buffer lines

The Vim editor SHALL support Ex join commands that combine prompt-buffer lines using Vim-like whitespace normalization.

#### Scenario: Join current line with next line by default

- **WHEN** the editor executes `:join` from normal mode with the cursor on a prompt line that has a following line
- **THEN** the current line and next line are replaced by one line whose boundary has at most one space, the cursor stays on the joined line, and the Ex row reports `2 lines joined`

#### Scenario: Join explicit range

- **WHEN** the editor executes `:2,4j`
- **THEN** prompt lines 2 through 4 are replaced by one joined line in the same location and the Ex row reports `3 lines joined`

#### Scenario: Join single last line is rejected

- **WHEN** the editor executes `:join` with the cursor on the last prompt line
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

#### Scenario: Percent join joins all lines

- **WHEN** the editor executes `:%join` in a multi-line prompt
- **THEN** all prompt lines are replaced by one joined prompt line

### Requirement: Ex nohlsearch clears visible prompt search highlights

The Vim editor SHALL support Ex nohlsearch commands that clear visible prompt search highlights without changing prompt text.

#### Scenario: Clear visible search highlights

- **WHEN** prompt search highlights are visible and the editor executes `:nohlsearch`
- **THEN** visible search highlights clear, prompt text and cursor position remain unchanged, and Ex command-line mode closes without an error

#### Scenario: Nohlsearch alias executes

- **WHEN** prompt search highlights are visible and the editor executes `:noh`
- **THEN** visible search highlights clear with the same behavior as `:nohlsearch`

#### Scenario: Repeat search remains available after nohlsearch

- **WHEN** the editor has a previous successful prompt search, visible highlights are cleared by `:nohlsearch`, and the user presses `n` or `N`
- **THEN** repeat search still moves to the next or previous matching prompt-buffer text

#### Scenario: Nohlsearch without highlights is harmless

- **WHEN** no prompt search highlights are visible and the editor executes `:nohlsearch`
- **THEN** prompt text, cursor position, registers, and last-search state remain unchanged

### Requirement: Non-substitution Ex command side effects are bounded

The Vim editor SHALL keep non-substitution Ex command side effects explicit and consistent with existing modal behavior.

#### Scenario: Text-changing Ex commands clear visible search highlights

- **WHEN** visible search highlights exist and `:delete`, `:put`, `:copy`, `:move`, or `:join` changes prompt text
- **THEN** visible search highlights clear while prompt text reflects the command result

#### Scenario: Non-editing Ex commands preserve visible search highlights except nohlsearch

- **WHEN** visible search highlights exist and `:yank` succeeds
- **THEN** prompt text and visible search highlights remain unchanged

#### Scenario: Ex commands do not update dot repeat

- **WHEN** a non-substitution Ex command changes prompt text and the user later presses `.` in normal mode
- **THEN** dot repeat behavior uses the previous supported normal-mode repeatable change, if any, rather than the Ex command

#### Scenario: Ex line commands do not write named registers

- **WHEN** named register `a` contains text and the editor executes `:delete`, `:yank`, or `:put`
- **THEN** named register `a` remains unchanged while the unnamed-register behavior follows the specific Ex command semantics
