# vim-customization-diagnostics Specification

## Purpose
TBD - created by archiving change self-explaining-customization-suite. Update Purpose after archive.
## Requirements
### Requirement: Runtime customization diagnostics are available

The Vim editor SHALL provide runtime diagnostics that explain the current customization state without requiring users to inspect settings files or source code.

#### Scenario: Doctor reports healthy customization state

- **WHEN** the editor executes `:vimdoctor` with no retained settings warnings and no detected keymap conflicts
- **THEN** the editor shows a transient message indicating customization is healthy

#### Scenario: Doctor reports settings warnings

- **WHEN** the editor executes `:vimdoctor` after settings resolution recorded invalid fields, protected keys, or keymap conflicts
- **THEN** the editor shows a transient message that includes the warning count and the highest-priority actionable warning

#### Scenario: Doctor does not reread settings files

- **WHEN** the editor executes `:vimdoctor`
- **THEN** diagnostics are based on the options and warnings retained for that editor instance rather than re-reading global or project settings files

### Requirement: Customization commands preserve prompt editing state

Runtime customization diagnostics SHALL be read-only with respect to prompt editing state.

#### Scenario: Diagnostic command leaves prompt text unchanged

- **WHEN** the editor executes `:vimdoctor`, `:keymap`, `:mapcheck`, or `:actions`
- **THEN** prompt text, cursor position, mode, visual selection, search highlights, registers, marks, macro slots, and dot-repeat state remain unchanged except for the transient diagnostic message

#### Scenario: Diagnostic command from visual Ex mode preserves selection

- **WHEN** Ex command-line mode was opened from a visual selection and the user executes a diagnostic command
- **THEN** the command exits Ex mode without editing prompt text and restores the original visual mode state according to existing Ex cancellation behavior

### Requirement: Action search is discoverable and finite

The Vim editor SHALL expose a searchable list of supported semantic actions without implying support for arbitrary Vim commands.

#### Scenario: Actions command lists supported categories

- **WHEN** the editor executes `:actions` without a query
- **THEN** the editor shows a compact summary of supported action categories such as commands, motions, operators, text objects, macros, marks, searches, and prompt transforms

#### Scenario: Actions command searches metadata

- **WHEN** the editor executes `:actions redo` or another query matching an action id, description, or current binding
- **THEN** the editor shows the best matching supported action and its current binding when one exists

#### Scenario: Actions command rejects unsupported parity claims

- **WHEN** the editor executes `:actions vimscript` or another query that matches no supported finite action
- **THEN** the editor shows a transient no-match message rather than inventing unsupported Vim behavior

### Requirement: Map checking explains keys and conflicts

The Vim editor SHALL explain whether a key or key sequence is mapped, unmapped, protected, conflicting, or unsupported.

#### Scenario: Mapped key is explained

- **WHEN** the editor executes `:mapcheck ctrl+r` and `ctrl+r` resolves to redo in the current normal-mode keymap
- **THEN** the editor shows the matched action, action kind, and current binding

#### Scenario: Protected shortcut is explained

- **WHEN** the editor executes `:mapcheck ctrl+p` or another Pi-owned protected shortcut
- **THEN** the editor shows that the shortcut is protected, names the Pi behavior it preserves when known, and does not treat it as a configurable pi-vimmode binding

#### Scenario: Conflicting configured sequence is explained

- **WHEN** settings contain a keymap conflict that was ignored during resolution and the editor executes `:mapcheck` for the conflicting sequence
- **THEN** the editor shows that the sequence was rejected or ignored because of the conflict and identifies at least one conflicting action when known

### Requirement: Optional no-op feedback is scoped and quiet by default

The Vim editor SHALL support optional feedback for confusing no-op inputs while preserving quiet default modal editing.

#### Scenario: No-op feedback defaults to off

- **WHEN** no no-op feedback setting is enabled and the user presses an unmapped normal-mode key
- **THEN** the editor preserves existing quiet no-op behavior and does not show a new transient feedback message

#### Scenario: Enabled feedback explains protected delegation

- **WHEN** no-op feedback is enabled and the user presses a protected Pi shortcut in normal mode
- **THEN** the editor delegates or handles the shortcut according to existing ownership rules and shows a transient explanation when the shortcut is not owned by pi-vimmode

#### Scenario: Enabled feedback avoids message floods

- **WHEN** no-op feedback is enabled and repeated invalid or unmapped inputs occur
- **THEN** the editor keeps feedback bounded to transient single messages and does not accumulate a multi-line log

