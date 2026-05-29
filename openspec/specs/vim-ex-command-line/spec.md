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

