## MODIFIED Requirements

### Requirement: Mode feedback is visible and width-safe

The Vim editor SHALL render Vim status feedback according to the resolved UI configuration and MUST keep every rendered line within the terminal width. With no UI configuration, the current `INSERT`, `NORMAL`, `VISUAL`, and `V-LINE` feedback remains visible.

#### Scenario: Mode label updates

- **WHEN** the editor switches between insert, normal, characterwise visual, and visual line modes with default UI configuration
- **THEN** the rendered editor shows `INSERT`, `NORMAL`, `VISUAL`, or `V-LINE` feedback matching the active mode

#### Scenario: Configured mode label updates

- **WHEN** the editor switches modes and `piVimMode.ui.mode.labels` configures labels for those modes
- **THEN** the rendered editor shows the configured active-mode label where the mode status item is enabled and width permits

#### Scenario: Mode status can be hidden by config

- **WHEN** `piVimMode.ui.mode.enabled` is set to `false` or the status item list omits `mode`
- **THEN** the rendered editor omits mode feedback while preserving prompt editing behavior

#### Scenario: Render width respected

- **WHEN** Pi renders the editor with any supported terminal width and any supported UI configuration
- **THEN** every rendered line from the editor fits within the provided width

#### Scenario: Visual selection status shown

- **WHEN** the editor is in visual mode with a non-empty selection and the selection status item is enabled
- **THEN** the rendered feedback includes a visible indication of visual mode and selection size, range, or preview according to UI configuration

#### Scenario: Visual selection status hidden by config

- **WHEN** the editor is in visual mode with a non-empty selection and `piVimMode.ui.selection.enabled` is set to `false`
- **THEN** visual highlighting remains active but visual selection summary text is omitted from the status UI
