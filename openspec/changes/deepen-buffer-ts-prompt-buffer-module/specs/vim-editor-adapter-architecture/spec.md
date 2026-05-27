## MODIFIED Requirements

### Requirement: Modal editing module owns modal state transitions

The modal editing module SHALL own Vim mode state transitions, pending command handling, register updates, and command execution decisions for supported prompt-editing behavior while delegating pure prompt text mechanics to operation-level prompt buffer APIs.

#### Scenario: Insert mode handles escape semantics

- **WHEN** the editor is in insert mode and receives `Esc`
- **THEN** the modal module decides whether to enter normal mode or request Pi delegation for active autocomplete behavior

#### Scenario: Normal mode handles finite command parsing

- **WHEN** the editor is in normal mode and receives a supported printable Vim key sequence
- **THEN** the modal module uses the finite command parser and returns state/effects for the supported command without inserting the printable key as text

#### Scenario: Pending command invalidates safely

- **WHEN** the editor is in normal mode with a pending `g`, `d`, `c`, or `y` command and receives an unsupported printable key
- **THEN** the modal module clears the pending command and returns no text insertion effect

#### Scenario: Visual modes preserve anchor behavior

- **WHEN** the editor is in characterwise visual mode or visual line mode and receives supported motion or operation keys
- **THEN** the modal module preserves current visual anchor semantics while using prompt buffer operation APIs for selection movement, yank, delete, change, cancel, or mode switching effects

#### Scenario: Prompt buffer operations replace low-level helper composition

- **WHEN** the modal module or adapter needs navigation, visual editing, linewise editing, operator-motion editing, or paste behavior
- **THEN** it calls prompt buffer operation APIs instead of assembling behavior from low-level text helper exports
