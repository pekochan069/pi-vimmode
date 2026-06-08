## MODIFIED Requirements

### Requirement: Ex command-line row is width-safe and composes with Vim UI

The Vim editor SHALL render the dedicated Ex command-line row without breaking width safety, prompt viewport bounds, status UI, visual selection rendering, search highlight rendering, or configured workbench row reservation.

#### Scenario: Ex row respects terminal width

- **WHEN** Ex command-line mode is active and Pi renders the editor at any supported terminal width
- **THEN** every rendered line, including the dedicated Ex row, fits within the provided width

#### Scenario: Ex row shrinks viewport while preserving status UI by default

- **WHEN** the Ex row is visible, status UI is enabled, and no workbench row reservation is configured
- **THEN** the prompt box and status UI render with one fewer viewport row while the Ex row renders below them

#### Scenario: Ex row uses configured reserved viewport

- **WHEN** the Ex row is visible and `piVimMode.ui.workbench.reservedRows` is greater than one
- **THEN** the prompt box and status UI render with the configured reserved-row count removed from the prompt viewport while the Ex row renders within the reserved workbench area

#### Scenario: Ex row composes with visual selection rendering

- **WHEN** Ex command-line mode was opened from a visual mode with an active selection
- **THEN** the prompt still renders the visual selection and the dedicated Ex row renders the editable Ex command text below the prompt box

#### Scenario: Ex row composes with search highlights

- **WHEN** prompt search highlights are visible and Ex command-line mode is active
- **THEN** search highlights remain visible in the prompt render and the dedicated Ex row renders below the prompt box

#### Scenario: Transient Ex message clears on next input

- **WHEN** a transient Ex error or success message is visible in the dedicated Ex row
- **THEN** the next handled input clears the message and restores the prompt viewport to its normal or configured reserved height unless Ex command-line mode is active again

### Requirement: Shared workbench row renders search and Ex input width-safely

The Vim editor SHALL render pending `/`, `?`, and `:` workbench input in a dedicated width-safe workbench area that composes with the prompt viewport, configured row reservation, and existing Vim UI.

#### Scenario: Forward search workbench row is visible

- **WHEN** forward search input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the `/` prefix and current pending search text without inserting that text into the prompt buffer

#### Scenario: Backward search workbench row is visible

- **WHEN** backward search input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the `?` prefix and current pending search text without inserting that text into the prompt buffer

#### Scenario: Ex workbench row remains visible

- **WHEN** Ex command-line input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the `:` prefix and current pending Ex command text

#### Scenario: Workbench row shrinks prompt viewport by default

- **WHEN** a search or Ex workbench row is visible for active input, preview, success, or error messaging and no workbench row reservation is configured
- **THEN** the prompt editor viewport uses one fewer terminal row so total rendering remains bounded

#### Scenario: Workbench row uses configured reserved rows

- **WHEN** `piVimMode.ui.workbench.reservedRows` is configured and a search, Ex, preview, success, or error workbench row is visible
- **THEN** the prompt editor viewport uses the greater of one active workbench row and the configured reserved-row count so total rendering remains bounded and stable

#### Scenario: Reserved idle workbench area is width-safe

- **WHEN** `piVimMode.ui.workbench.reservedRows` is greater than zero and no search, Ex, preview, success, or error workbench row is visible
- **THEN** the editor still reserves the configured blank workbench rows below the prompt while every rendered line fits within the provided width

#### Scenario: Long workbench text is truncated safely

- **WHEN** pending workbench text is longer than the available terminal width
- **THEN** the workbench row truncates or scrolls the displayed text without emitting lines wider than the terminal width

### Requirement: Workbench UI behavior is documented and validated

The change SHALL include automated rendering tests and user-facing documentation for shared workbench display behavior, including configured reserved workbench rows.

#### Scenario: Render validation runs

- **WHEN** `bun test` is executed
- **THEN** render tests cover `/`, `?`, and `:` workbench rows, long pending text, substitution match preview messages/highlights, transient regex errors, default viewport shrink behavior, configured reserved rows, idle reserved rows, visual selection composition, search highlight composition, and narrow terminal widths

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: User docs describe workbench row

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents where `/`, `?`, `:` workbench input, substitution match previews, counts, and errors appear and how active and configured reserved workbench rows affect prompt viewport height

## ADDED Requirements

### Requirement: Workbench row reservation is configurable

The Vim editor SHALL support `piVimMode.ui.workbench.reservedRows` as the Pi-native configuration surface for reserving bounded workbench rows below the prompt.

#### Scenario: Default workbench reservation preserves current layout

- **WHEN** no `piVimMode.ui.workbench.reservedRows` setting is configured and no workbench input or message is active
- **THEN** the editor reserves no idle workbench rows and preserves the existing prompt viewport height

#### Scenario: Active workbench row still appears with default reservation

- **WHEN** no `piVimMode.ui.workbench.reservedRows` setting is configured and search input, Ex input, preview, success, or error feedback is active
- **THEN** the editor reserves one workbench row for active feedback according to existing behavior

#### Scenario: Reserved rows keep idle command area visible

- **WHEN** `piVimMode.ui.workbench.reservedRows` is set to `2` and no workbench input or message is active
- **THEN** the editor reserves two width-safe rows below the prompt and the prompt viewport uses two fewer terminal rows

#### Scenario: Active feedback renders within reserved rows

- **WHEN** `piVimMode.ui.workbench.reservedRows` is set to `2` and Ex command-line mode is active
- **THEN** the Ex command text renders in the reserved workbench area without subtracting an additional row beyond the configured two rows

#### Scenario: Reserved rows are bounded

- **WHEN** `piVimMode.ui.workbench.reservedRows` is configured with an unsupported value such as a negative number, non-integer, non-number, or value greater than the documented maximum
- **THEN** settings resolution records a warning, ignores the invalid field, preserves valid sibling UI settings, and uses the default workbench reservation

#### Scenario: Live editor honors workbench reservation

- **WHEN** a live `VimEditor` is constructed with resolved `piVimMode.ui.workbench.reservedRows`
- **THEN** rendering uses the resolved reserved-row count rather than silently falling back to defaults

#### Scenario: Settings reference documents workbench reservation

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.ui.workbench.reservedRows`, default behavior, supported bounds, examples, and the relationship between reserved rows and active workbench feedback
