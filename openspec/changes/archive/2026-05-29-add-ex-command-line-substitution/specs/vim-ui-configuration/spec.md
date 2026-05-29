## ADDED Requirements

### Requirement: Ex command-line row is width-safe and composes with Vim UI

The Vim editor SHALL render the dedicated Ex command-line row without breaking width safety, prompt viewport bounds, status UI, visual selection rendering, or search highlight rendering.

#### Scenario: Ex row respects terminal width

- **WHEN** Ex command-line mode is active and Pi renders the editor at any supported terminal width
- **THEN** every rendered line, including the dedicated Ex row, fits within the provided width

#### Scenario: Ex row shrinks viewport while preserving status UI

- **WHEN** the Ex row is visible and status UI is enabled
- **THEN** the prompt box and status UI render with one fewer viewport row while the Ex row renders below them

#### Scenario: Ex row composes with visual selection rendering

- **WHEN** Ex command-line mode was opened from a visual mode with an active selection
- **THEN** the prompt still renders the visual selection and the dedicated Ex row renders the editable Ex command text below the prompt box

#### Scenario: Ex row composes with search highlights

- **WHEN** prompt search highlights are visible and Ex command-line mode is active
- **THEN** search highlights remain visible in the prompt render and the dedicated Ex row renders below the prompt box

#### Scenario: Transient Ex message clears on next input

- **WHEN** a transient Ex error or success message is visible in the dedicated Ex row
- **THEN** the next handled input clears the message and restores the prompt viewport to its normal height unless Ex command-line mode is active again
