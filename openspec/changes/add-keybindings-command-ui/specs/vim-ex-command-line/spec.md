## ADDED Requirements

### Requirement: Ex command-line supports keybindings popup command

The Vim editor SHALL parse and execute `:keybindings` and `:keybindings <query>` as finite read-only Ex commands that display bounded popup output.

#### Scenario: Keybindings command opens catalog popup

- **WHEN** Ex command-line mode is active and the user executes `:keybindings`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only popup listing effective pi-vimmode keybindings grouped by finite supported categories

#### Scenario: Keybindings query opens detail popup

- **WHEN** Ex command-line mode is active and the user executes `:keybindings redo`, `:keybindings ctrl+p`, or another non-empty query
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only popup containing matching keybinding details or a finite no-match result

#### Scenario: Keybindings command rejects unsupported abbreviations

- **WHEN** Ex command-line mode receives unsupported command names such as `:keybinding`, `:keys`, `:map`, or `:nmap`
- **THEN** the editor reports a readable Ex error and leaves prompt text unchanged

#### Scenario: Keybindings command preserves visual source state

- **WHEN** Ex command-line mode was opened from visual, visual-line, or visual-block mode and the user executes `:'<,'>keybindings` or deletes the visual range marker and executes `:keybindings`
- **THEN** the editor exits Ex command-line mode, restores the original visual mode selection state according to read-only popup behavior, opens the popup, and leaves prompt text unchanged

### Requirement: Keybindings popup command is read-only

The `:keybindings` Ex command SHALL NOT mutate prompt-editing state beyond bounded popup display and existing successful Ex history semantics.

#### Scenario: Keybindings catalog leaves editing state unchanged

- **WHEN** the editor executes `:keybindings` from normal Ex command-line mode
- **THEN** prompt text, cursor position, registers, marks, macros, search query state, visible search highlights, resolved options, retained diagnostics, and dot-repeat state remain unchanged except for opening the popup

#### Scenario: Keybindings detail leaves message history unpolluted

- **WHEN** the editor executes `:keybindings redo` and then the user scrolls or dismisses the popup
- **THEN** retained runtime message history does not grow solely because the keybindings popup content was shown, scrolled, or dismissed

#### Scenario: Keybindings command does not become repeat change

- **WHEN** the editor executes `:keybindings` after a repeatable normal-mode edit and then the user presses the repeat-change command
- **THEN** repeat-change behavior uses the previous supported edit rather than replaying the keybindings popup command
