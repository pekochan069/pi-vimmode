## ADDED Requirements

### Requirement: Read-only Ex output opens a popup

The Vim editor SHALL display successful read-only Ex help, runtime discovery, customization diagnostic, and inspectability output in a bounded read-only popup instead of the inline workbench/message row.

#### Scenario: Read-only popup opens after normal Ex command

- **WHEN** Ex command-line mode was opened from normal mode and the user executes a valid read-only command such as `:help`, `:features redo`, `:actions search`, `:keymap redo`, `:mapcheck ctrl+p`, `:vimdoctor`, `:messages`, or `:vimmode inspect`
- **THEN** Ex command-line mode closes, the editor remains in normal mode, prompt text and cursor remain unchanged, and a centered bounded read-only popup shows the command output

#### Scenario: Read-only popup opens after visual Ex command

- **WHEN** Ex command-line mode was opened from visual, visual-line, or visual-block mode and the user executes a valid read-only help, diagnostic, runtime discovery, message, or inspect command
- **THEN** Ex command-line mode closes, the original visual mode and captured selection are restored, prompt text remains unchanged, and a centered bounded read-only popup shows the command output

#### Scenario: Popup command output handles no-match result

- **WHEN** the user executes a valid read-only command that returns a bounded no-match or empty-state result such as `:help vimscript`, `:features unsupported-query`, or `:messages` with no retained messages
- **THEN** the no-match or empty-state result is shown in the read-only popup and prompt text remains unchanged

#### Scenario: Unsupported command stays inline error

- **WHEN** the user executes an unsupported Ex command or unsupported abbreviation such as `:h`, `:feat`, `:mes`, `:map`, or `:vimmode status`
- **THEN** the editor reports the existing bounded Ex error through compact command-line feedback, does not open a read-only popup, and leaves prompt text unchanged

#### Scenario: Mutating Ex commands keep existing behavior

- **WHEN** the user executes a mutating or editing Ex command such as `:s`, `:d`, `:y`, `:put`, `:copy`, `:move`, `:join`, a prompt transform, or `:noh`
- **THEN** the command follows its existing edit, no-op, preview, success, or error behavior and does not route normal edit feedback through the read-only popup

## MODIFIED Requirements

### Requirement: Ex command-line supports read-only customization commands

The Vim editor SHALL parse and execute finite read-only Ex commands for customization diagnostics, displaying successful diagnostic output in a bounded read-only popup.

#### Scenario: Vimdoctor command executes

- **WHEN** Ex command-line mode is active and the user executes `:vimdoctor`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only popup containing the customization diagnostic output

#### Scenario: Keymap command executes with optional query

- **WHEN** Ex command-line mode is active and the user executes `:keymap` or `:keymap redo`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only popup describing matching effective keymap entries

#### Scenario: Mapcheck command requires a query

- **WHEN** Ex command-line mode is active and the user executes `:mapcheck ctrl+p`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only popup explaining the queried key or key sequence

#### Scenario: Actions command executes with optional query

- **WHEN** Ex command-line mode is active and the user executes `:actions` or `:actions search`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only popup listing or searching supported finite actions

### Requirement: Diagnostic Ex commands are side-effect bounded

Read-only diagnostic Ex commands SHALL NOT perform prompt-buffer edits or editing-state mutations beyond bounded popup display and existing successful Ex command history semantics.

#### Scenario: Diagnostic command does not write registers

- **WHEN** the user executes `:keymap`, `:mapcheck`, `:actions`, or `:vimdoctor`
- **THEN** unnamed and named edit registers keep their previous values

#### Scenario: Diagnostic command does not affect search state

- **WHEN** search highlights or a previous search query exist and the user executes a diagnostic Ex command
- **THEN** search query state, repeat search direction, and visible search highlights remain unchanged

#### Scenario: Diagnostic command does not participate in repeat change

- **WHEN** the user executes a diagnostic Ex command and then presses the repeat-change command
- **THEN** repeat-change behavior uses the previous real edit when one exists and does not repeat the diagnostic command

#### Scenario: Diagnostic popup does not pollute retained runtime messages

- **WHEN** a diagnostic Ex command opens a read-only popup and the user scrolls or dismisses that popup
- **THEN** retained runtime message history does not grow solely because the popup content was shown, scrolled, or dismissed

### Requirement: Ex command-line supports finite inspectability diagnostics

The Vim editor SHALL parse and execute `:vimmode inspect` and `:messages` as finite read-only Ex diagnostic commands without adding arbitrary Vimscript or command dispatch, and SHALL display successful inspectability output in a bounded read-only popup.

#### Scenario: Vimmode inspect command executes

- **WHEN** Ex command-line mode is active and the user executes `:vimmode inspect`
- **THEN** the editor exits Ex command-line mode, opens a bounded read-only popup containing the prompt-local inspect diagnostic, and leaves prompt text unchanged

#### Scenario: Messages command executes

- **WHEN** Ex command-line mode is active and the user executes `:messages`
- **THEN** the editor exits Ex command-line mode, opens a bounded read-only popup containing recent-message diagnostics or an empty-history message, and leaves prompt text unchanged

#### Scenario: Inspect command supports exact finite syntax

- **WHEN** the Ex parser receives `vimmode inspect`
- **THEN** it returns a finite parse result for the inspectability diagnostic command

#### Scenario: Unsupported inspect syntax is rejected

- **WHEN** the Ex parser receives unsupported inspectability syntax such as `vimmode`, `vimmode status`, `vimmode inspect raw`, `messages clear`, or `mes`
- **THEN** it returns a readable Ex error and prompt text remains unchanged

### Requirement: Ex command-line supports finite runtime help commands

The Vim editor SHALL parse and execute finite read-only runtime help commands from Ex command-line mode, displaying successful runtime help output in a bounded read-only popup.

#### Scenario: Help command executes

- **WHEN** the editor executes `:help` or `:help search`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only popup for the requested help entry or help index

#### Scenario: Features command executes

- **WHEN** the editor executes `:features` or `:features redo`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only popup for the requested feature list, feature match, or no-match result

#### Scenario: Messages command executes

- **WHEN** the editor executes `:messages`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only popup describing retained runtime messages without adding the popup output to retained message history

#### Scenario: Unsupported runtime help abbreviation is rejected

- **WHEN** the editor executes an unsupported abbreviation such as `:h`, `:feat`, or `:mes`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

#### Scenario: Unexpected messages arguments are rejected

- **WHEN** the editor executes `:messages noisy` or another `:messages` command with unsupported trailing arguments
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

### Requirement: Runtime help Ex commands are read-only

Runtime help Ex commands SHALL not edit the prompt buffer or mutate modal editing side effects beyond bounded read-only popup display and existing successful Ex command history semantics.

#### Scenario: Runtime help command preserves normal-mode state

- **WHEN** the editor executes `:help`, `:features`, or `:messages` from normal Ex command-line mode
- **THEN** prompt text, cursor position, registers, marks, search highlights, macro state, and dot-repeat state remain unchanged except for the read-only popup display

#### Scenario: Runtime help command preserves visual Ex state

- **WHEN** Ex command-line mode was opened from a visual selection, the user deletes the prefilled visual range marker, and executes `:help`, `:features`, or `:messages`
- **THEN** the command exits Ex mode without editing prompt text, restores the original visual mode, anchor, cursor, and highlight according to existing visual Ex restoration behavior, and opens the read-only popup

#### Scenario: Runtime help command does not update dot repeat

- **WHEN** the editor executes `:help`, `:features`, or `:messages` after a repeatable normal-mode edit
- **THEN** pressing `.` later repeats the previous supported normal-mode edit rather than replaying the runtime help command

#### Scenario: Runtime help popup does not pollute retained messages

- **WHEN** runtime help output opens in a read-only popup and the user scrolls or dismisses that popup
- **THEN** retained runtime message history does not grow solely because the popup content was shown, scrolled, or dismissed

## REMOVED Requirements

### Requirement: Inspectability Ex output uses existing workbench feedback surface

**Reason**: Inspectability diagnostics are read-only output that can exceed the compact workbench row. The generic read-only popup replaces the workbench feedback surface for successful `:vimmode inspect` and `:messages` output.

**Migration**: Use the new read-only Ex popup behavior for successful inspectability output. Existing compact workbench feedback remains for parser errors, edit-flow messages, unsupported inspect syntax, and other non-popup Ex feedback.
