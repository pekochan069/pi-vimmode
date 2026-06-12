## ADDED Requirements

### Requirement: Read-only popup contract stays behind a shared seam

The modal editing architecture SHALL keep generic read-only popup state and pure popup helpers in a shared seam that is independent of feature-specific popup content builders.

#### Scenario: Modal types import generic popup state from the shared seam

- **WHEN** modal state or modal effects need to reference a read-only popup
- **THEN** they import the popup contract from the shared popup seam rather than from a keybinding-discovery, runtime-help, customization, or inspectability content module

#### Scenario: Feature content builders do not own popup mechanics

- **WHEN** runtime help, keybinding discovery, customization diagnostics, message history, or inspectability code builds popup content
- **THEN** it produces the shared read-only popup data shape without redefining popup state, body row sizing, message splitting, or scroll clamping

#### Scenario: Popup extraction avoids feature-content import cycles

- **WHEN** the project imports modal types, popup content builders, inspectability helpers, and read-only popup overlay code in tests
- **THEN** those imports do not require a cycle between keybinding-discovery content, modal inspectability content, and modal type definitions

### Requirement: Popup helper extraction preserves adapter effect boundary

Read-only popup helper extraction SHALL preserve `ModalEffect` as the only contract for opening popups from modal logic and SHALL keep Pi/TUI calls inside the `VimEditor` adapter or overlay component integration.

#### Scenario: Modal code opens popups through typed effects

- **WHEN** modal command handling opens a read-only popup for a supported help, feature, customization, message, or inspectability command
- **THEN** it returns the existing typed popup effect without calling Pi TUI APIs directly

#### Scenario: Popup-local controls remain prompt-safe

- **WHEN** a read-only popup is opened, scrolled, or dismissed after the seam extraction
- **THEN** prompt text, cursor position, registers, named registers, marks, macro slots, macro recording state, search highlights, visual state, dot-repeat state, and Pi delegation behavior remain governed by the existing modal effect and overlay contracts
