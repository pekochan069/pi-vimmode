## ADDED Requirements

### Requirement: Normal mode reselects the last visual selection

The Vim editor SHALL retain one prompt-local last visual selection and SHALL allow normal mode to re-enter that selection with `gv` when the stored selection is still valid for the current prompt text.

#### Scenario: Reselect characterwise visual selection

- **WHEN** the editor had an active characterwise visual selection, the user exited visual mode, and then presses `gv` in normal mode
- **THEN** the editor enters characterwise visual mode with the previous visual anchor, restores the cursor to the previous active selection endpoint, and leaves prompt text unchanged

#### Scenario: Reselect linewise visual selection

- **WHEN** the editor had an active visual line selection, the user exited visual mode, and then presses `gv` in normal mode
- **THEN** the editor enters visual line mode with the previous anchor line, restores the cursor to the previous active line endpoint, and leaves prompt text unchanged

#### Scenario: Reselect blockwise visual selection

- **WHEN** the editor had an active visual block selection, the user exited visual mode, and then presses `gv` in normal mode
- **THEN** the editor enters visual block mode with the previous block anchor, restores the cursor to the previous block endpoint, and leaves prompt text unchanged

#### Scenario: Last visual selection updates on later visual exit

- **WHEN** the user exits one visual selection and later exits another visual selection
- **THEN** `gv` reselects only the most recent visual selection

#### Scenario: Missing last visual selection is safe

- **WHEN** the editor is in normal mode with no stored last visual selection and the user presses `gv`
- **THEN** prompt text, cursor position, registers, marks, search state, and mode remain unchanged

#### Scenario: Stale last visual selection is safe

- **WHEN** the stored last visual selection contains an anchor or active cursor position outside the current prompt text and the user presses `gv`
- **THEN** prompt text, cursor position, registers, marks, search state, and mode remain unchanged
