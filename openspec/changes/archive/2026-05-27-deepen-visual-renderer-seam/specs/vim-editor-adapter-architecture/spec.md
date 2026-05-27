## MODIFIED Requirements

### Requirement: Status and rendering boundaries remain width-safe

The refactor SHALL keep mode feedback and visual rendering width-safe while deepening active visual view construction inside the renderer and separating it from Pi-facing adapter rendering.

#### Scenario: Non-visual rendering delegates to Pi base renderer

- **WHEN** the editor renders outside visual modes
- **THEN** the adapter uses Pi's base editor rendering path and applies only the current status feedback and cursor marker restyling integration

#### Scenario: Visual renderer receives cohesive render input

- **WHEN** the editor renders in characterwise visual mode or visual line mode with an active anchor
- **THEN** the adapter passes one cohesive active-visual render input to the renderer instead of coordinating layout, wrapping, scrolling, highlight, or cursor-precedence details itself

#### Scenario: Visual rendering remains scoped

- **WHEN** the editor renders in characterwise visual mode or visual line mode with an active anchor
- **THEN** visual highlighting remains scoped to the selected range and rendered lines stay within the requested width

#### Scenario: Visual renderer owns active visual view mechanics

- **WHEN** the visual renderer receives prompt content, cursor, active visual state, cursor style, viewport data, and display hooks
- **THEN** it derives wrapped layout, scroll window, selected cell display, empty selected line display, cursor precedence, padding, and width-safe border or scroll indicator rows without requiring the Pi adapter to compute those details

#### Scenario: Status derivation is testable

- **WHEN** mode, pending command, or visual selection state changes
- **THEN** testable status/view helpers can derive the correct label and summary data without requiring Pi TUI objects
