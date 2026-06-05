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

The Vim editor SHALL keep Ex command-line editing finite, prompt-local, and separate from prompt-buffer editing while adding shared workbench history and substitution preview controls.

#### Scenario: Type Ex command text

- **WHEN** Ex command-line mode is active and the user types printable characters
- **THEN** those characters are appended to the Ex command text and are not inserted into the prompt buffer

#### Scenario: Backspace edits Ex command text

- **WHEN** Ex command-line mode is active and the user presses `Backspace`
- **THEN** the last editable Ex command character is removed when one exists, any pending substitution preview is cleared, and prompt text remains unchanged

#### Scenario: Enter executes non-preview Ex command text

- **WHEN** Ex command-line mode is active with a non-empty non-substitution command and the user presses `Enter` or `Return`
- **THEN** the editor parses and executes the Ex command text and exits Ex command-line mode

#### Scenario: Enter previews substitution before execution

- **WHEN** Ex command-line mode is active with a valid substitution command that has at least one match and no active preview exists
- **THEN** pressing `Enter` or `Return` computes a substitution match preview/count, keeps Ex command-line mode active, and leaves prompt text unchanged

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

The Vim editor SHALL parse Ex substitution syntax with literal default behavior and explicit bounded regex pattern opt-in, without recursive mappings, Vimscript evaluation, or replacement backreference expansion.

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
- **THEN** all addressed literal matches are removed according to the `g` flag after the substitution preview is applied

#### Scenario: Empty pattern is rejected

- **WHEN** the editor executes `:%s//new/g`
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Omitted final delimiter is allowed without flags

- **WHEN** the editor executes `:s/old/new`
- **THEN** the substitution previews and applies as if the final delimiter were present and no flags were provided

#### Scenario: Omitted final delimiter is not allowed with flags

- **WHEN** the editor executes `:s/old/newg`
- **THEN** the trailing `g` is treated as replacement text, not as a flag

#### Scenario: Regex flag enables bounded regex pattern mode

- **WHEN** the editor executes `:%s/TODO|FIXME/done/gr` in a prompt containing `TODO` and `FIXME`
- **THEN** the `r` flag treats `TODO|FIXME` as a bounded regex pattern, the `g` flag applies all non-overlapping regex matches per addressed line after preview confirmation, and replacement text is inserted literally

#### Scenario: Regex flag composes with ignore-case flag

- **WHEN** the editor executes `:%s/todo/done/ri` in a prompt containing `TODO`
- **THEN** the `r` flag enables regex pattern mode and the `i` flag makes the regex match case-insensitive

#### Scenario: Unsupported flag is rejected

- **WHEN** the editor executes `:%s/old/new/c`
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Replacement tokens are literal

- **WHEN** the editor executes `:%s/(old)/&-$1-\1/gr`
- **THEN** replacement text inserts literal `&-$1-\1` rather than matched text or backreferences after preview confirmation

#### Scenario: Invalid regex pattern is rejected

- **WHEN** the editor executes a substitution with the `r` flag and invalid regex pattern syntax
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Regex bound exceeded is rejected

- **WHEN** a regex substitution pattern, addressed prompt text, or match count exceeds the documented regex substitution bounds
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Zero-length regex substitution is rejected

- **WHEN** a regex substitution would match zero-length text in the addressed range
- **THEN** the editor reports an Ex error and prompt text remains unchanged

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

### Requirement: Ex command-line uses shared workbench history

The Vim editor SHALL keep finite in-memory history for successfully executed Ex command lines and expose it while Ex command-line input is active.

#### Scenario: Successful Ex command enters history

- **WHEN** the user executes a supported Ex command successfully
- **THEN** the executed command text is added to Ex history without changing registers, marks, dot-repeat state, or search state beyond the command's documented side effects

#### Scenario: Failed Ex command does not enter history

- **WHEN** the user executes an unsupported Ex command, invalid range, invalid regex, no-match substitution, or command that exceeds documented bounds
- **THEN** that command text is not added to Ex history

#### Scenario: Substitution enters history after apply

- **WHEN** the user previews a substitution and then confirms it with `Enter` or `Return`
- **THEN** the substitution command text is added to Ex history after the apply step succeeds, not when the preview is first shown

#### Scenario: Ex history previous recalls entry

- **WHEN** Ex command-line input is active and Ex history contains an older entry
- **THEN** pressing the resolved history-previous key replaces the pending Ex command text with that history entry, clears any pending preview, and leaves prompt text unchanged

#### Scenario: Ex history next restores newer entry or draft

- **WHEN** Ex command-line input is active after history-previous navigation
- **THEN** pressing the resolved history-next key moves toward newer history entries and eventually restores the draft command text that existed before history navigation

#### Scenario: Visual Ex history preserves captured selection on cancel

- **WHEN** Ex command-line mode was opened from a visual mode, the user navigates Ex history, and then presses `Esc`
- **THEN** Ex command-line mode closes, prompt text remains unchanged, and the original visual mode, visual anchor, and visual cursor are restored according to existing visual Ex cancellation semantics

### Requirement: Ex substitution preview is required before prompt mutation

The Vim editor SHALL highlight matched substitution targets and report match counts before applying replacements to prompt text.

#### Scenario: Literal substitution previews count

- **WHEN** the editor is in Ex command-line mode with `:%s/foo/bar/g` and the addressed range contains three literal matches
- **THEN** the first `Enter` highlights the three literal matches, reports `3 matches found`, and prompt text remains unchanged

#### Scenario: Regex substitution previews count

- **WHEN** the editor is in Ex command-line mode with `:%s/TODO|FIXME/done/gr` and the addressed range contains two regex matches
- **THEN** the first `Enter` highlights the two regex matches, reports `2 matches found`, and prompt text remains unchanged

#### Scenario: Confirm preview applies substitution

- **WHEN** a substitution preview is active and the user presses `Enter` or `Return` without changing the command text
- **THEN** the editor applies the previewed substitution, exits Ex command-line mode, updates prompt text, preserves documented cursor intent, and reports the applied substitution count

#### Scenario: Cancel preview is safe

- **WHEN** a substitution preview is active and the user presses `Esc`
- **THEN** Ex command-line mode closes according to the source mode's cancellation semantics and prompt text remains unchanged

#### Scenario: Editing command clears preview

- **WHEN** a substitution preview is active and the user types, backspaces, or navigates Ex history
- **THEN** the preview is cleared and a later `Enter` previews the updated command instead of applying the stale preview

#### Scenario: Pattern not found does not preview

- **WHEN** the editor enters a valid substitution command whose pattern has no matches in the addressed range
- **THEN** the editor reports a readable pattern-not-found Ex error, exits Ex command-line mode, and prompt text remains unchanged

#### Scenario: Identical replacement previews and applies as success

- **WHEN** the editor enters `:s/foo/foo/` and the addressed line contains `foo`
- **THEN** the first `Enter` reports a match count and the confirmation reports success without applying a text-change effect

### Requirement: Ex workbench behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for Ex history, regex substitution mode, and substitution preview.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover Ex workbench typing, cancellation, history navigation, visual Ex cancellation after history navigation, literal substitution match preview/apply, regex substitution match preview/apply, invalid regex safety, regex bounds, unsupported flags, no-match behavior, identical replacement behavior, and history recording rules

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide describes Ex workbench

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents Ex command history, substitution match preview/apply flow, literal default behavior, regex `r` flag, regex bounds, literal replacement tokens, and current Ex limitations

### Requirement: Ex command-line supports read-only customization commands

The Vim editor SHALL parse and execute finite read-only Ex commands for customization diagnostics.

#### Scenario: Vimdoctor command executes

- **WHEN** Ex command-line mode is active and the user executes `:vimdoctor`
- **THEN** the editor exits Ex command-line mode and shows a transient customization diagnostic message

#### Scenario: Keymap command executes with optional query

- **WHEN** Ex command-line mode is active and the user executes `:keymap` or `:keymap redo`
- **THEN** the editor exits Ex command-line mode and shows a transient message describing matching effective keymap entries

#### Scenario: Mapcheck command requires a query

- **WHEN** Ex command-line mode is active and the user executes `:mapcheck ctrl+p`
- **THEN** the editor exits Ex command-line mode and shows a transient message explaining the queried key or key sequence

#### Scenario: Actions command executes with optional query

- **WHEN** Ex command-line mode is active and the user executes `:actions` or `:actions search`
- **THEN** the editor exits Ex command-line mode and shows a transient message listing or searching supported finite actions

### Requirement: Diagnostic Ex command parsing stays finite

The Ex parser SHALL support customization diagnostics through explicit command names rather than Vimscript evaluation, recursive mappings, or arbitrary command dispatch.

#### Scenario: Supported diagnostic command names parse

- **WHEN** the parser receives `vimdoctor`, `keymap`, `mapcheck`, or `actions` with valid arguments
- **THEN** it returns a finite parse result for that diagnostic command

#### Scenario: Unsupported diagnostic abbreviation is rejected

- **WHEN** the parser receives an unsupported abbreviation or unknown command such as `:vimd`, `:map`, or `:actionspalette`
- **THEN** it returns an Ex error and prompt text remains unchanged

#### Scenario: Diagnostic command arguments are bounded

- **WHEN** a diagnostic command receives an empty required argument, unsupported key notation, or an over-broad query
- **THEN** the editor reports a bounded Ex error or no-match diagnostic and prompt text remains unchanged

### Requirement: Diagnostic Ex commands are side-effect bounded

Read-only diagnostic Ex commands SHALL NOT perform prompt-buffer edits or editing-state mutations beyond transient message display.

#### Scenario: Diagnostic command does not write registers

- **WHEN** the user executes `:keymap`, `:mapcheck`, `:actions`, or `:vimdoctor`
- **THEN** unnamed and named edit registers keep their previous values

#### Scenario: Diagnostic command does not affect search state

- **WHEN** search highlights or a previous search query exist and the user executes a diagnostic Ex command
- **THEN** search query state, repeat search direction, and visible search highlights remain unchanged

#### Scenario: Diagnostic command does not participate in repeat change

- **WHEN** the user executes a diagnostic Ex command and then presses the repeat-change command
- **THEN** repeat-change behavior uses the previous real edit when one exists and does not repeat the diagnostic command

### Requirement: Ex line ranges support finite address offsets

The Vim editor SHALL support signed line offsets on finite Ex line addresses for supported line-oriented Ex commands.

#### Scenario: Offset from current line executes

- **WHEN** the editor is on prompt line 2 of a four-line prompt and executes `:.,.+1delete`
- **THEN** prompt lines 2 and 3 are deleted, the unnamed register receives those lines as linewise text, and the Ex row reports the deleted line count

#### Scenario: Offset from last line executes

- **WHEN** the editor executes `:$-1,$join` in a prompt with at least two lines
- **THEN** the last two prompt lines are joined according to existing Ex join whitespace and message semantics

#### Scenario: Offset from numeric line executes

- **WHEN** the editor executes `:3+1yank` in a prompt with at least four lines
- **THEN** prompt line 4 is copied to the unnamed register as linewise text and prompt text remains unchanged

#### Scenario: Offset range applies to substitution preview

- **WHEN** the editor previews `:2,2+1s/foo/bar/g` in a prompt where lines 2 and 3 contain matches
- **THEN** substitution preview highlights matches only on prompt lines 2 and 3 and leaves prompt text unchanged until confirmation

#### Scenario: Out-of-bounds offset is rejected

- **WHEN** the editor executes an Ex command with an offset resolving outside prompt-buffer lines such as `:1-1delete` or `:$+1yank`
- **THEN** the editor reports an Ex range error, prompt text remains unchanged, and registers remain unchanged

#### Scenario: Repeated offset is rejected in v1

- **WHEN** the editor executes an Ex command with repeated offset syntax such as `:.+1-2delete`
- **THEN** the editor reports a readable Ex range error, prompt text remains unchanged, and registers remain unchanged

### Requirement: Ex semicolon ranges reset the second address base

The Vim editor SHALL support a finite Ex semicolon range form where the first resolved single-line address becomes the current-line base for resolving the second single-line address.

#### Scenario: Semicolon relative range executes

- **WHEN** the editor executes `:2;.+2delete` in a prompt with at least four lines
- **THEN** prompt lines 2 through 4 are deleted and the unnamed register receives those lines as linewise text

#### Scenario: Semicolon range can use current-line start

- **WHEN** the editor is on prompt line 3 and executes `:.;.-1yank`
- **THEN** the editor reports an Ex range error because the resolved range is reversed and prompt text and registers remain unchanged

#### Scenario: Semicolon range composes with substitution preview

- **WHEN** the editor previews `:2;.+1s/foo/bar/g` in a prompt where lines 2 and 3 contain matches
- **THEN** substitution preview highlights matches only on prompt lines 2 and 3 and leaves prompt text unchanged until confirmation

#### Scenario: Unsupported semicolon forms are rejected

- **WHEN** the editor executes a semicolon range using unsupported broad syntax such as repeated separators, expression ranges, or a missing second address
- **THEN** the editor reports a readable Ex range error and prompt text remains unchanged

### Requirement: Ex copy and move destination addresses support finite offsets

The Vim editor SHALL support signed line offsets on finite Ex destination addresses for copy and move commands while preserving existing destination-zero behavior.

#### Scenario: Copy destination offset executes

- **WHEN** the editor executes `:2copy$-1` in a prompt with at least four lines
- **THEN** prompt line 2 is duplicated after the penultimate line and before the original last line

#### Scenario: Move destination offset executes

- **WHEN** the editor is on prompt line 1 and executes `:4move.+1` in a prompt with at least four lines
- **THEN** prompt line 4 is moved after prompt line 2 and the Ex row reports `1 line moved`

#### Scenario: Destination zero remains before first line

- **WHEN** the editor executes `:2t0` or `:3,4m0` with valid source ranges
- **THEN** existing before-first-line destination behavior is preserved

#### Scenario: Destination zero is not an offset base

- **WHEN** the editor executes a copy or move command with an offset applied to destination zero such as `:2t0+1`
- **THEN** the editor reports a readable Ex range error and prompt text remains unchanged

#### Scenario: Destination offset inside moved range is rejected

- **WHEN** the editor executes `:2,4move3+0`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

### Requirement: Ex range algebra behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for visible Ex offset and semicolon range behavior.

#### Scenario: Automated range validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover Ex address offsets, semicolon base semantics, destination offsets, destination zero preservation, visual range preservation, invalid offset safety, substitution preview ranges, and non-substitution command ranges

#### Scenario: Feature guide describes finite Ex ranges

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents supported Ex offsets, semicolon range behavior, destination offset behavior, destination zero behavior, and unsupported range syntax limits

### Requirement: Ex command-line supports finite inspectability diagnostics

The Vim editor SHALL parse and execute `:vimmode inspect` and `:messages` as finite read-only Ex diagnostic commands without adding arbitrary Vimscript or command dispatch.

#### Scenario: Vimmode inspect command executes

- **WHEN** Ex command-line mode is active and the user executes `:vimmode inspect`
- **THEN** the editor exits Ex command-line mode, shows a bounded prompt-local inspect diagnostic, and leaves prompt text unchanged

#### Scenario: Messages command executes

- **WHEN** Ex command-line mode is active and the user executes `:messages`
- **THEN** the editor exits Ex command-line mode, shows a bounded recent-message diagnostic, and leaves prompt text unchanged

#### Scenario: Inspect command supports exact finite syntax

- **WHEN** the Ex parser receives `vimmode inspect`
- **THEN** it returns a finite parse result for the inspectability diagnostic command

#### Scenario: Unsupported inspect syntax is rejected

- **WHEN** the Ex parser receives unsupported inspectability syntax such as `vimmode`, `vimmode status`, `vimmode inspect raw`, `messages clear`, or `mes`
- **THEN** it returns a readable Ex error and prompt text remains unchanged

### Requirement: Inspectability diagnostics compose with Ex source-mode restoration

Inspectability diagnostics SHALL follow existing Ex command-line source-mode restoration rules for normal and visual source modes.

#### Scenario: Normal source mode returns to normal

- **WHEN** `:vimmode inspect` or `:messages` is executed from Ex command-line mode opened in normal mode
- **THEN** Ex command-line mode closes, the editor remains in normal mode, and the original prompt text and cursor are preserved

#### Scenario: Visual source mode restores captured selection

- **WHEN** `:vimmode inspect` or `:messages` is executed from Ex command-line mode opened in visual, visual-line, or visual-block mode
- **THEN** Ex command-line mode closes, the original visual mode and captured selection are restored, and prompt text remains unchanged

#### Scenario: Inspectability diagnostics do not enter Ex history as edits

- **WHEN** `:vimmode inspect` or `:messages` executes successfully
- **THEN** the command may be recorded according to existing successful Ex history rules, but it does not update registers, search state, visible search highlights, marks, macros, cursor target, or repeat-change state

### Requirement: Inspectability Ex output uses existing workbench feedback surface

The Ex command-line implementation SHALL show inspectability diagnostics through existing bounded diagnostic/workbench feedback rather than adding a new persistent render surface.

#### Scenario: Inspect output appears as bounded diagnostic feedback

- **WHEN** `:vimmode inspect` executes
- **THEN** the diagnostic appears through the same transient feedback path used by finite read-only diagnostic Ex commands or a bounded message-view path, and total editor rendering remains width-safe

#### Scenario: Messages output does not change prompt viewport rules permanently

- **WHEN** `:messages` executes
- **THEN** any visible diagnostic feedback uses existing workbench row behavior and clears according to existing transient feedback clearing rules while retained history remains available to future `:messages`

#### Scenario: Pending Ex preview is cleared safely

- **WHEN** an inspectability diagnostic is executed while an Ex substitution preview had been active for the same pending Ex command text
- **THEN** the preview is cleared, prompt text remains unchanged, and no stale substitution edit is applied

### Requirement: Ex command-line supports finite runtime help commands

The Vim editor SHALL parse and execute finite read-only runtime help commands from Ex command-line mode.

#### Scenario: Help command executes

- **WHEN** the editor executes `:help` or `:help search`
- **THEN** the editor exits Ex command-line mode and shows a bounded informational message for the requested help entry

#### Scenario: Features command executes

- **WHEN** the editor executes `:features` or `:features redo`
- **THEN** the editor exits Ex command-line mode and shows a bounded informational message for the requested feature list or feature match

#### Scenario: Messages command executes

- **WHEN** the editor executes `:messages`
- **THEN** the editor exits Ex command-line mode and shows a bounded informational message describing retained runtime messages

#### Scenario: Unsupported runtime help abbreviation is rejected

- **WHEN** the editor executes an unsupported abbreviation such as `:h`, `:feat`, or `:mes`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

#### Scenario: Unexpected messages arguments are rejected

- **WHEN** the editor executes `:messages noisy` or another `:messages` command with unsupported trailing arguments
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

### Requirement: Runtime help Ex commands are read-only

Runtime help Ex commands SHALL not edit the prompt buffer or mutate modal editing side effects beyond the bounded informational message.

#### Scenario: Runtime help command preserves normal-mode state

- **WHEN** the editor executes `:help`, `:features`, or `:messages` from normal Ex command-line mode
- **THEN** prompt text, cursor position, registers, marks, search highlights, macro state, and dot-repeat state remain unchanged except for the transient informational message

#### Scenario: Runtime help command preserves visual Ex state

- **WHEN** Ex command-line mode was opened from a visual selection, the user deletes the prefilled visual range marker, and executes `:help`, `:features`, or `:messages`
- **THEN** the command exits Ex mode without editing prompt text and restores the original visual mode, anchor, cursor, and highlight according to existing visual Ex restoration behavior

#### Scenario: Runtime help command does not update dot repeat

- **WHEN** the editor executes `:help`, `:features`, or `:messages` after a repeatable normal-mode edit
- **THEN** pressing `.` later repeats the previous supported normal-mode edit rather than replaying the runtime help command

