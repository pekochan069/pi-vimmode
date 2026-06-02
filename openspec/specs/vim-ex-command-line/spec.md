# vim-ex-command-line Specification

## Purpose

TBD - created by archiving change add-ex-command-line-substitution. Update Purpose after archive.

## Requirements

### Requirement: Normal and visual modes enter Ex command-line mode

The Vim editor SHALL support Ex command-line mode for line-oriented prompt-buffer commands from normal mode and visual modes.

#### Scenario: Enter Ex command-line from normal mode

- **WHEN** the editor is in normal mode and the user presses the resolved Ex command-line entry key
- **THEN** the editor enters Ex command-line mode with an empty command after the leading `:` prompt

#### Scenario: Enter Ex command-line from visual mode

- **WHEN** the editor is in visual, visual-line, or visual-block mode with an active selection and the user presses the resolved Ex command-line entry key
- **THEN** the editor enters Ex command-line mode with `'<,'>` prefilled as the editable visual range marker and keeps the original visual selection highlighted while command-line mode is active

#### Scenario: Cancel normal Ex command-line

- **WHEN** Ex command-line mode was opened from normal mode and the user presses `Esc`
- **THEN** Ex command-line mode closes, prompt text remains unchanged, and the editor returns to normal mode

#### Scenario: Cancel visual Ex command-line

- **WHEN** Ex command-line mode was opened from a visual mode and the user presses `Esc`
- **THEN** Ex command-line mode closes, prompt text remains unchanged, and the editor returns to the original visual mode with the original selection intact

#### Scenario: Empty Ex command is harmless

- **WHEN** Ex command-line mode is active with an empty or whitespace-only command and the user presses `Enter`
- **THEN** Ex command-line mode closes without an error message and prompt text remains unchanged

### Requirement: Ex command-line input uses minimal editing controls

The Vim editor SHALL keep v1 Ex command-line editing minimal and separate from prompt-buffer editing.

#### Scenario: Type Ex command text

- **WHEN** Ex command-line mode is active and the user types printable characters
- **THEN** those characters are appended to the Ex command text and are not inserted into the prompt buffer

#### Scenario: Backspace edits Ex command text

- **WHEN** Ex command-line mode is active and the user presses `Backspace`
- **THEN** the last editable Ex command character is removed when one exists, and prompt text remains unchanged

#### Scenario: Enter executes Ex command text

- **WHEN** Ex command-line mode is active with a non-empty command and the user presses `Enter` or `Return`
- **THEN** the editor parses and executes the Ex command text and exits Ex command-line mode

### Requirement: Ex command-line mode renders in a dedicated row

The Vim editor SHALL render Ex command-line input and transient Ex messages in a dedicated row below the prompt box.

#### Scenario: Active Ex command row is visible

- **WHEN** Ex command-line mode is active
- **THEN** the rendered editor includes an extra width-safe row below the prompt box showing the leading `:` and current Ex command text

#### Scenario: Ex row shrinks prompt viewport

- **WHEN** the Ex row is visible for active input or a transient message
- **THEN** the prompt editor viewport uses one fewer terminal row so total rendering remains bounded

#### Scenario: Ex error message is transient

- **WHEN** an Ex command fails with an Ex error
- **THEN** the dedicated Ex row shows a readable error message until the next handled input clears it

#### Scenario: Ex success message includes counts

- **WHEN** an Ex substitution completes with at least one match
- **THEN** the dedicated Ex row shows a readable substitution count message until the next handled input clears it

### Requirement: Ex ranges address prompt-buffer lines

The Vim editor SHALL resolve Ex ranges as line ranges over the prompt buffer using 1-based user-facing line numbers.

#### Scenario: Omitted range uses current line

- **WHEN** the editor executes `:s/old/new/` from normal mode
- **THEN** Ex substitution applies to the current prompt line only

#### Scenario: Percent range uses all lines

- **WHEN** the editor executes `:%s/old/new/g`
- **THEN** Ex substitution applies to every prompt line

#### Scenario: Numeric line range executes

- **WHEN** the editor executes `:2,4s/old/new/g` in a prompt with at least four lines
- **THEN** Ex substitution applies only to prompt lines 2 through 4 inclusive

#### Scenario: Dot and dollar addresses execute

- **WHEN** the editor executes `:.,$s/old/new/g`
- **THEN** Ex substitution applies from the current prompt line through the last prompt line inclusive

#### Scenario: Visual range marker uses captured selected lines

- **WHEN** Ex command-line mode was opened from a visual selection and the editor executes `:'<,'>s/old/new/g`
- **THEN** Ex substitution applies to all lines touched by the captured visual selection, not only selected characters or block cells

#### Scenario: Visual range marker deleted falls back to command text

- **WHEN** Ex command-line mode was opened from a visual selection, the user deletes the prefilled `'<,'>` marker, and executes `:s/old/new/`
- **THEN** Ex substitution applies to the current prompt line according to the command text range

#### Scenario: Manual visual marker without capture is invalid

- **WHEN** Ex command-line mode was opened from normal mode and the user executes `:'<,'>s/old/new/`
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Invalid numeric range is rejected

- **WHEN** the editor executes an Ex command with an out-of-bounds or reversed range such as `:999s/a/b/` or `:5,3s/a/b/`
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Count before Ex entry prefills range

- **WHEN** the editor is in normal mode on prompt line 2 of a five-line prompt and the user presses `3:`
- **THEN** Ex command-line mode opens with the concrete clamped range `2,4` prefilled after the leading `:`

### Requirement: Ex substitution supports literal replacement

The Vim editor SHALL implement v1 Ex substitution as literal, line-local replacement using exact `s` and `substitute` command names.

#### Scenario: Substitute first match on current line

- **WHEN** the editor executes `:s/old/new/` and the current line contains `old`
- **THEN** the first `old` on the current line is replaced with `new`, matching from the start of the line

#### Scenario: Substitute first match per addressed line

- **WHEN** the editor executes `:%s/old/new/` and multiple addressed lines contain `old`
- **THEN** the first `old` on each addressed line is replaced with `new`

#### Scenario: Global flag replaces all matches per addressed line

- **WHEN** the editor executes `:%s/old/new/g`
- **THEN** all non-overlapping `old` matches on each addressed line are replaced with `new`

#### Scenario: Case-insensitive flag matches literal text ignoring case

- **WHEN** the editor executes `:%s/old/new/i`
- **THEN** literal matches such as `old`, `Old`, and `OLD` in the addressed lines are eligible for replacement according to non-global substitution rules

#### Scenario: Full substitute command name executes

- **WHEN** the editor executes `:%substitute/old/new/g`
- **THEN** it applies the same Ex substitution behavior as `:%s/old/new/g`

#### Scenario: Unsupported command abbreviation is rejected

- **WHEN** the editor executes `:%sub/old/new/g`
- **THEN** the editor reports an Ex error and prompt text remains unchanged

### Requirement: Ex substitution parser is finite and explicit

The Vim editor SHALL parse Ex substitution syntax without regex patterns, recursive mappings, or Vimscript evaluation.

#### Scenario: Alternate delimiter executes

- **WHEN** the editor executes `:%s#old/path#new/path#g`
- **THEN** `#` is used as the substitution delimiter and literal slashes in the pattern and replacement need no escaping

#### Scenario: Invalid delimiter is rejected

- **WHEN** the editor executes a substitution using whitespace, an alphanumeric character, a control character, or backslash as the delimiter
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Delimiter and backslash escapes are decoded

- **WHEN** the editor executes `:%s#old\#value#new\\value#g`
- **THEN** the pattern is treated as literal `old#value` and the replacement as literal `new\value`

#### Scenario: Empty replacement is valid

- **WHEN** the editor executes `:%s/old//g`
- **THEN** all addressed literal matches are removed according to the `g` flag

#### Scenario: Empty pattern is rejected

- **WHEN** the editor executes `:%s//new/g`
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Omitted final delimiter is allowed without flags

- **WHEN** the editor executes `:s/old/new`
- **THEN** the substitution executes as if the final delimiter were present and no flags were provided

#### Scenario: Omitted final delimiter is not allowed with flags

- **WHEN** the editor executes `:s/old/newg`
- **THEN** the trailing `g` is treated as replacement text, not as a flag

#### Scenario: Unsupported flag is rejected

- **WHEN** the editor executes `:%s/old/new/c`
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Replacement tokens are literal

- **WHEN** the editor executes `:%s/old/&-$1-\1/g`
- **THEN** replacement text inserts literal `&-$1-\1` rather than matched text or backreferences

### Requirement: Ex substitution has narrow edit side effects

The Vim editor SHALL apply Ex substitution without corrupting modal state, registers, prompt search, or cursor intent.

#### Scenario: Pattern not found reports error

- **WHEN** the editor executes a valid Ex substitution whose pattern has no matches in the addressed range
- **THEN** the editor reports a readable pattern-not-found Ex error and prompt text remains unchanged

#### Scenario: Successful substitution preserves cursor intent

- **WHEN** Ex substitution changes prompt text
- **THEN** the cursor returns to the original cursor position clamped against the edited prompt text

#### Scenario: Successful substitution does not update registers

- **WHEN** Ex substitution replaces text
- **THEN** unnamed and named registers remain unchanged

#### Scenario: Successful substitution does not update dot repeat

- **WHEN** Ex substitution replaces text and the user later presses `.` in normal mode
- **THEN** dot repeat behavior uses the previous supported normal-mode repeatable change, if any, rather than the Ex substitution

#### Scenario: Successful substitution clears search highlights

- **WHEN** prompt search highlights are visible and Ex substitution changes prompt text
- **THEN** visible search highlights clear while prompt text reflects the substitution

#### Scenario: Identical replacement counts as success without edit effect

- **WHEN** Ex substitution matches text but produces identical prompt text such as `:s/foo/foo/`
- **THEN** the editor reports a successful substitution count without applying a text-change effect

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
