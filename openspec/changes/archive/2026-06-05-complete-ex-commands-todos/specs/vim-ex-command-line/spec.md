## MODIFIED Requirements

### Requirement: Ex command-line input uses minimal editing controls

The Vim editor SHALL keep Ex command-line editing finite, prompt-local, cursor-aware, and separate from prompt-buffer editing while preserving shared workbench history and substitution preview controls.

#### Scenario: Type Ex command text at end

- **WHEN** Ex command-line mode is active, the command cursor is at the end of the Ex command text, and the user types printable characters
- **THEN** those characters are appended to the Ex command text and are not inserted into the prompt buffer

#### Scenario: Type Ex command text at cursor

- **WHEN** Ex command-line mode is active, the user moves the command cursor left, and the user types printable characters
- **THEN** those characters are inserted at the command cursor, the command cursor advances after the inserted text, any pending substitution preview is cleared, and prompt text remains unchanged

#### Scenario: Backspace edits Ex command text at cursor

- **WHEN** Ex command-line mode is active and the user presses `Backspace`
- **THEN** the editable Ex command character before the command cursor is removed when one exists, the command cursor is clamped to the edited command text, any pending substitution preview is cleared, and prompt text remains unchanged

#### Scenario: Delete edits Ex command text at cursor

- **WHEN** Ex command-line mode is active and the user presses the resolved forward-delete key
- **THEN** the editable Ex command character after the command cursor is removed when one exists, any pending substitution preview is cleared, and prompt text remains unchanged

#### Scenario: Cursor movement edits no prompt text

- **WHEN** Ex command-line mode is active and the user presses resolved command-line movement keys such as Left, Right, Home, End, word-left, or word-right
- **THEN** only the Ex command cursor moves within command-text bounds and prompt text remains unchanged

#### Scenario: Word deletion is bounded

- **WHEN** Ex command-line mode is active and the user presses the resolved command-line delete-word key
- **THEN** only the word or whitespace run adjacent to the Ex command cursor is removed from the Ex command text, any pending substitution preview is cleared, and prompt text remains unchanged

#### Scenario: History recall updates command cursor

- **WHEN** Ex command-line input is active and history navigation replaces the pending Ex command text
- **THEN** the command cursor moves to the end of the recalled command, any pending substitution preview is cleared, and prompt text remains unchanged

#### Scenario: Enter executes non-preview Ex command text

- **WHEN** Ex command-line mode is active with a non-empty non-substitution command and the user presses `Enter` or `Return`
- **THEN** the editor parses and executes the Ex command text and exits Ex command-line mode

#### Scenario: Enter previews substitution before execution

- **WHEN** Ex command-line mode is active with a valid mutating substitution command that has at least one match and no active preview exists
- **THEN** pressing `Enter` or `Return` computes a substitution match preview/count, keeps Ex command-line mode active, and leaves prompt text unchanged

### Requirement: Ex command-line supports finite non-substitution commands

The Vim editor SHALL parse and execute a finite set of non-substitution Ex commands while preserving existing Ex substitution behavior and explicitly supported register operands.

#### Scenario: Supported command aliases execute

- **WHEN** the editor executes supported aliases `:d`, `:delete`, `:y`, `:yank`, `:pu`, `:put`, `:t`, `:copy`, `:m`, `:move`, `:j`, `:join`, `:noh`, or `:nohlsearch` with valid arguments
- **THEN** the command executes according to its prompt-buffer Ex semantics and exits Ex command-line mode

#### Scenario: Supported Ex register operands execute

- **WHEN** the editor executes `:delete a`, `:yank A`, `:put a`, or range-qualified forms such as `:2,4delete b`
- **THEN** the command parses as a supported finite line command with a register operand and executes according to named-register Ex semantics

#### Scenario: Unsupported command is rejected

- **WHEN** the editor executes unsupported Ex commands such as `:write`, `:print`, `:global/foo/delete`, or an unsupported abbreviation such as `:co$`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

#### Scenario: Unexpected trailing arguments are rejected

- **WHEN** the editor executes an Ex command with unsupported trailing arguments such as `:delete "a`, `:put ab`, or `:join!`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

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

#### Scenario: Ex line commands without register operands do not write named registers

- **WHEN** named register `a` contains text and the editor executes `:delete`, `:yank`, or `:put` without a register operand
- **THEN** named register `a` remains unchanged while the unnamed-register behavior follows the specific Ex command semantics

#### Scenario: Ex line commands with register operands use named registers

- **WHEN** named register `a` contains text and the editor executes `:delete a`, `:yank A`, or `:put a`
- **THEN** only the documented register operand semantics affect named registers while unrelated named registers remain unchanged

### Requirement: Ex workbench behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for Ex history, cursor-aware Ex command-line editing, regex substitution mode, repeat substitution, substitution flags, substitution preview, register operands, and current limitations.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover Ex workbench typing, cursor movement, cursor-aware deletion, command-line word deletion, cancellation, history navigation, visual Ex cancellation after history navigation, literal substitution match preview/apply, regex substitution match preview/apply, count-only substitutions, no-error substitutions, repeat substitution, invalid regex safety, regex bounds, unsupported flags, no-match behavior, identical replacement behavior, register operands, and history recording rules

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide describes Ex workbench

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents Ex command history, cursor-aware command-line editing, substitution match preview/apply flow, literal default behavior, regex `r` flag, count-only `n` flag, no-error `e` flag, repeat-substitution commands, regex bounds, literal replacement tokens, Ex register operands, and current Ex limitations

## ADDED Requirements

### Requirement: Ex substitution supports finite safe additional flags

The Vim editor SHALL support a finite prompt-safe subset of additional Ex substitution flags without expanding into Vimscript, confirmation prompts, print modes, or replacement backreference expansion.

#### Scenario: Count-only flag reports matches without mutation

- **WHEN** the editor executes `:%s/foo/bar/gn` and the addressed range contains matches
- **THEN** the editor reports the match count, leaves prompt text unchanged, exits Ex command-line mode without requiring a second apply confirmation, and records the command as a successful Ex history entry

#### Scenario: Count-only flag composes with regex and ignore-case

- **WHEN** the editor executes `:%s/todo/done/rin` in a prompt containing `TODO`
- **THEN** the editor counts regex matches case-insensitively, reports the count, leaves prompt text unchanged, and does not apply replacement text

#### Scenario: No-error flag suppresses no-match error

- **WHEN** the editor executes `:%s/missing/new/e` and the addressed range has no matches
- **THEN** the editor leaves prompt text unchanged, reports a zero-match non-error result, exits Ex command-line mode, and records the command as a successful Ex history entry

#### Scenario: No-error flag does not suppress invalid syntax

- **WHEN** the editor executes a substitution with the `e` flag and an invalid delimiter, invalid regex pattern, out-of-bounds range, or unsupported flag
- **THEN** the editor reports the underlying Ex error, does not record the command as successful history, and leaves prompt text unchanged

#### Scenario: Count-only substitution does not become repeat source

- **WHEN** the editor executes a count-only substitution and then executes a repeat-substitution command
- **THEN** the repeat-substitution command uses the last successfully applied substitution before the count-only command, or reports that no repeatable substitution exists

### Requirement: Ex repeat-substitution commands reuse the last applied substitution safely

The Vim editor SHALL support finite repeat-substitution commands that reuse the last successfully applied substitution semantics while preserving substitution preview safety.

#### Scenario: Repeat substitution previews before mutation

- **WHEN** the editor has previously applied `:%s/foo/bar/g`, Ex command-line mode is active on a prompt containing `foo`, and the user executes `:&`
- **THEN** the editor previews the repeated substitution over the resolved current range, reports the match count, keeps prompt text unchanged, and requires confirmation before applying replacement text

#### Scenario: Range-qualified repeat substitution executes

- **WHEN** the editor has previously applied a substitution and then executes `:%&`
- **THEN** the repeated substitution resolves the explicit percent range, previews matches over the whole prompt, and applies only after confirmation

#### Scenario: Double-ampersand repeat is accepted as finite alias

- **WHEN** the editor has previously applied a substitution and executes `:&&`
- **THEN** the editor repeats the same stored substitution semantics as `:&` using the current resolved range and the existing preview/apply safety

#### Scenario: No previous substitution is safe

- **WHEN** the editor executes `:&` before any substitution has successfully applied in the current editor session
- **THEN** the editor reports a readable Ex error, leaves prompt text unchanged, and does not add the repeat command to Ex history

#### Scenario: Repeat source updates after successful apply

- **WHEN** the editor applies a new substitution after an older substitution exists
- **THEN** later repeat-substitution commands use the newer applied substitution semantics

#### Scenario: Repeat substitution keeps bounded side effects

- **WHEN** a repeated substitution applies successfully
- **THEN** it preserves existing Ex substitution side-effect rules for cursor intent, registers, dot-repeat, search highlights, Ex messages, and history recording
