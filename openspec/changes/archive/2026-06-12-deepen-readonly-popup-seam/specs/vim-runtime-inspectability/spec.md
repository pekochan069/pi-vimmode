## ADDED Requirements

### Requirement: Inspectability popups use the shared read-only popup contract

Runtime inspectability output SHALL continue to use the generic bounded read-only popup contract after popup state and pure popup helpers move behind a shared seam.

#### Scenario: Inspect output remains popup-backed after seam extraction

- **WHEN** the user executes `:vimmode inspect` after the shared popup seam is introduced
- **THEN** the editor opens a bounded read-only popup containing the same finite, redacted inspect summary semantics as before the extraction

#### Scenario: Messages output remains popup-backed after seam extraction

- **WHEN** the user executes `:messages` after the shared popup seam is introduced
- **THEN** the editor opens a bounded read-only popup containing retained message history or the existing empty-history summary without retaining the popup output as a new history entry

#### Scenario: Inspectability content remains source-backed

- **WHEN** inspectability popup content is generated for `:messages` or `:vimmode inspect`
- **THEN** the content comes from the existing bounded inspectability/message-history summaries and not from duplicated popup-only diagnostic strings

#### Scenario: Shared popup mechanics do not change inspectability side effects

- **WHEN** an inspectability popup is shown, scrolled, or dismissed
- **THEN** prompt text, cursor position, mode, visual anchor/cursor restoration, registers, named registers, marks, macro slots, search state, visible search highlights, Ex history, repeat-change state, and retained message history semantics remain unchanged except for existing popup display and scroll state
