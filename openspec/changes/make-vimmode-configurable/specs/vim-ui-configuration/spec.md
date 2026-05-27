## ADDED Requirements

### Requirement: Status UI items are configurable

The Vim editor SHALL read `piVimMode.ui.status` to determine which status items are rendered and in what order while preserving the current status UI by default.

#### Scenario: Default status UI preserved

- **WHEN** no `piVimMode.ui` setting is configured
- **THEN** the editor shows the current mode label, pending operator when present, and visual selection summary when visual selection is active

#### Scenario: Status item order configured

- **WHEN** `piVimMode.ui.status.items` is set to a valid ordered list of supported items
- **THEN** the editor renders those enabled status items in the configured order when each item has content

#### Scenario: Status UI disabled

- **WHEN** `piVimMode.ui.status.enabled` is set to `false`
- **THEN** the editor omits Vim status items while preserving prompt editing behavior and terminal-width safety

#### Scenario: Invalid status item falls back

- **WHEN** `piVimMode.ui.status.items` contains an unsupported item name
- **THEN** the unsupported item is ignored, a warning is recorded, and supported status items remain usable

### Requirement: Mode labels are configurable

The Vim editor SHALL support configured labels for insert, normal, characterwise visual, and visual line modes.

#### Scenario: Mode labels configured

- **WHEN** `piVimMode.ui.mode.labels.normal` is set to a non-empty string and the editor is in normal mode
- **THEN** the rendered mode status uses the configured normal-mode label when width permits

#### Scenario: Narrow mode labels configured

- **WHEN** `piVimMode.ui.mode.narrowLabels.visualLine` is set to a non-empty string and available status width is narrow
- **THEN** the rendered visual-line mode status uses the configured narrow label

#### Scenario: Mode status disabled

- **WHEN** `piVimMode.ui.mode.enabled` is set to `false`
- **THEN** the mode label item is omitted from the Vim status UI

#### Scenario: Invalid mode label falls back

- **WHEN** a configured mode label is empty or not a string
- **THEN** that mode uses the default label and the rest of the UI config remains usable

### Requirement: Cursor position display is configurable

The Vim editor SHALL support optional line and column display in the Vim status UI.

#### Scenario: Cursor position enabled

- **WHEN** `piVimMode.ui.cursorPosition.enabled` is set to `true`
- **THEN** the status UI includes the current cursor line and column using the configured base and format

#### Scenario: Cursor position base configured

- **WHEN** `piVimMode.ui.cursorPosition.base` is set to `0`
- **THEN** line and column values are rendered with zero-based coordinates

#### Scenario: Cursor position format configured

- **WHEN** `piVimMode.ui.cursorPosition.format` contains `{line}` and `{column}` placeholders
- **THEN** the status UI replaces those placeholders with the current cursor line and column values

#### Scenario: Invalid cursor position config falls back

- **WHEN** cursor position config has an unsupported base or invalid format
- **THEN** the invalid field falls back to default behavior and does not fail rendering

### Requirement: Visual selection status is configurable

The Vim editor SHALL support UI config for visual selection summaries without changing selection semantics.

#### Scenario: Selection preview length configured

- **WHEN** `piVimMode.ui.selection.previewMaxChars` is set to a supported non-negative integer
- **THEN** visual selection preview text is truncated to that configured display width

#### Scenario: Selection status disabled

- **WHEN** `piVimMode.ui.selection.enabled` is set to `false`
- **THEN** active visual selections still highlight and operate normally, but selection summary text is omitted from the status UI

### Requirement: Vim and Neovim option aliases are supported

The Vim editor SHALL support selected Vim/Neovim-style option aliases as read-only compatibility input under `piVimMode.vimOptions`.

#### Scenario: Showmode alias controls mode item

- **WHEN** `piVimMode.vimOptions.showmode` is set to `false` and no explicit `piVimMode.ui.mode.enabled` override is configured
- **THEN** the mode label item is omitted from the Vim status UI

#### Scenario: Showcmd alias controls pending command item

- **WHEN** `piVimMode.vimOptions.showcmd` is set to `false` and no explicit status override is configured
- **THEN** pending operator or pending sequence status is omitted from the Vim status UI

#### Scenario: Ruler alias controls cursor position item

- **WHEN** `piVimMode.vimOptions.ruler` is set to `true` and no explicit cursor position override is configured
- **THEN** the status UI includes line and column cursor position

#### Scenario: Explicit UI config overrides alias

- **WHEN** both `piVimMode.vimOptions.ruler` and `piVimMode.ui.cursorPosition.enabled` are configured
- **THEN** the explicit `piVimMode.ui.cursorPosition.enabled` value determines whether cursor position is rendered

### Requirement: UI configuration is width-safe, documented, and validated

The Vim editor MUST keep rendered output width-safe for every supported UI configuration.

#### Scenario: Width safety preserved

- **WHEN** Pi renders the editor at any supported terminal width with configured status items, labels, selection preview, and cursor position
- **THEN** every rendered line from the Vim editor fits within the provided width

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default UI, configured labels, disabled items, item ordering, cursor position formatting, Vim option aliases, invalid config fallback, and narrow-width rendering

#### Scenario: README documents UI config

- **WHEN** the user opens the project README
- **THEN** it documents `piVimMode.ui`, `piVimMode.vimOptions`, supported status items, label examples, cursor position examples, and unsupported full Vimscript/Neovim Lua import
