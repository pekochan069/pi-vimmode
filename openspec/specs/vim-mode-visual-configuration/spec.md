# vim-mode-visual-configuration Specification

## Purpose

TBD - created by archiving change enhance-visual-modes-and-cursors. Update Purpose after archive.

## Requirements

### Requirement: Visual selections are highlighted inline

The Vim editor SHALL render active visual selections with visible inline highlighting while preserving prompt text and terminal-width safety.

#### Scenario: Characterwise selection highlighted

- **WHEN** the editor is in characterwise visual mode with a non-empty selection
- **THEN** every visible selected character is rendered with a distinct highlight style

#### Scenario: Highlight follows motion

- **WHEN** the user moves the cursor while characterwise visual mode is active
- **THEN** the highlighted range updates to match the normalized inclusive range from the visual anchor to the current cursor

#### Scenario: Cursor remains distinguishable

- **WHEN** the cursor is inside a highlighted visual selection
- **THEN** the cursor rendering remains visually distinguishable from the selection highlight

#### Scenario: Highlight render width is safe

- **WHEN** Pi renders the editor at any supported terminal width while a visual selection is active
- **THEN** every rendered line from the Vim editor fits within the provided width

### Requirement: Visual line mode selects and operates on whole lines

The Vim editor SHALL support visual line mode for linewise selection and linewise operations.

#### Scenario: Enter visual line mode

- **WHEN** the editor is in normal mode and the user presses `V`
- **THEN** the editor enters visual line mode and anchors selection at the current line

#### Scenario: Visual line selection covers full lines

- **WHEN** the editor is in visual line mode and the cursor moves to another line
- **THEN** the active selection covers every full line from the anchor line through the current cursor line, inclusive

#### Scenario: Yank visual line selection

- **WHEN** the editor is in visual line mode and the user presses `y`
- **THEN** the selected lines are copied to the unnamed register as linewise text, visual selection clears, and the editor returns to normal mode

#### Scenario: Delete visual line selection

- **WHEN** the editor is in visual line mode and the user presses `d` or `x`
- **THEN** the selected full lines are removed, copied to the unnamed register as linewise text, visual selection clears, and the editor returns to normal mode with the prompt still editable

#### Scenario: Change visual line selection

- **WHEN** the editor is in visual line mode and the user presses `c`
- **THEN** the selected full lines are removed, copied to the unnamed register as linewise text, visual selection clears, and the editor enters insert mode

#### Scenario: Cancel visual line mode

- **WHEN** the editor is in visual line mode and the user presses `Esc`
- **THEN** visual selection clears and the editor returns to normal mode

### Requirement: Visual modes can switch selection kind

The Vim editor SHALL allow users to switch between characterwise visual mode and visual line mode without losing the active anchor.

#### Scenario: Switch from characterwise visual to visual line

- **WHEN** the editor is in characterwise visual mode and the user presses `V`
- **THEN** the editor switches to visual line mode using the existing anchor line and current cursor line

#### Scenario: Switch from visual line to characterwise visual

- **WHEN** the editor is in visual line mode and the user presses `v`
- **THEN** the editor switches to characterwise visual mode using the existing anchor position and current cursor position

### Requirement: Startup mode is configurable

The Vim editor SHALL support a settings-driven startup mode for newly created prompt editors.

#### Scenario: Default startup mode

- **WHEN** no `piVimMode.startMode` setting is configured
- **THEN** new Vim editor instances start in insert mode

#### Scenario: Normal startup mode configured

- **WHEN** `piVimMode.startMode` is set to `normal` in the active Pi settings
- **THEN** new Vim editor instances start in normal mode

#### Scenario: Project startup mode overrides global startup mode

- **WHEN** global Pi settings and project Pi settings both define `piVimMode.startMode`
- **THEN** the project setting determines the startup mode for sessions in that project

#### Scenario: Invalid startup mode setting

- **WHEN** `piVimMode.startMode` is missing or set to an unsupported value
- **THEN** the Vim editor falls back to insert mode and does not fail session startup

### Requirement: Cursor style is configurable per Vim mode

The Vim editor SHALL support settings-driven cursor styles for insert, normal, characterwise visual, and visual line modes.

#### Scenario: Default cursor styles

- **WHEN** no `piVimMode.cursor` setting is configured
- **THEN** insert mode uses a bar cursor and normal, visual, and visual line modes use block cursors

#### Scenario: Per-mode cursor style configured

- **WHEN** `piVimMode.cursor.<mode>` is set to `block`, `bar`, or `underline`
- **THEN** the Vim editor renders that cursor style whenever the corresponding mode is active

#### Scenario: Cursor style updates on mode transition

- **WHEN** the editor changes between insert, normal, visual, and visual line modes
- **THEN** the rendered cursor style updates to match the active mode configuration

#### Scenario: Invalid cursor style setting

- **WHEN** a cursor style setting is missing or unsupported
- **THEN** the Vim editor uses the default cursor style for that mode and does not fail session startup

### Requirement: Settings are namespaced and read-only

The Vim editor SHALL read extension settings from a `piVimMode` object without modifying Pi settings files. Supported settings include `startMode`, `cursor`, `keymap`, and `ui`.

#### Scenario: Namespaced settings loaded

- **WHEN** Pi starts a session with `piVimMode` configured in global or project settings
- **THEN** the extension reads only supported `piVimMode` fields for Vim editor behavior and ignores unrelated settings

#### Scenario: Project settings override global settings

- **WHEN** global Pi settings and project Pi settings both define supported `piVimMode` fields
- **THEN** project settings override global settings field by field without discarding unrelated global fields

#### Scenario: Settings file unavailable or invalid

- **WHEN** a settings file is absent, unreadable, or contains invalid JSON
- **THEN** the extension uses default Vim mode settings and keeps the prompt editor usable

#### Scenario: Invalid nested setting falls back

- **WHEN** a nested `piVimMode` field such as `cursor`, `keymap`, or `ui` contains an unsupported value
- **THEN** the invalid field falls back to its default or lower-precedence value, a warning is recorded, and sibling settings remain usable

### Requirement: New visual and configuration behavior is documented and tested

The change SHALL include tests and documentation for visual highlighting, visual line mode, startup mode settings, and per-mode cursor styles.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover visual highlight range mapping, visual line operations, config parsing/defaults, and mode-specific cursor rendering

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: README documents settings and keymap

- **WHEN** the user opens the project README
- **THEN** it documents `V`, visual line operations, visual selection highlighting, `piVimMode.startMode`, and `piVimMode.cursor` settings
