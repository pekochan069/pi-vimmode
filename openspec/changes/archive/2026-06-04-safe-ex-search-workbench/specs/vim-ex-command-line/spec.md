## MODIFIED Requirements

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

## ADDED Requirements

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
