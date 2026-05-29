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

#### Scenario: Bar cursor preserves current character

- **WHEN** the active cursor style is `bar` and the cursor is positioned over a non-empty character cell
- **THEN** the rendered cursor cell includes the underlying character, applies bar cursor styling, and remains one visible cell wide

#### Scenario: Bar cursor handles empty cursor cells

- **WHEN** the active cursor style is `bar` and the cursor is positioned at the end of a line or another empty cursor cell
- **THEN** the Vim editor renders a visible one-cell bar cursor placeholder without hiding adjacent text

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

### Requirement: Visual block mode selects rectangular text regions

The Vim editor SHALL support a visual block mode that selects a rectangular region bounded by the visual anchor and cursor across prompt lines.

#### Scenario: Enter visual block mode

- **WHEN** the editor is in normal mode and the user presses `Ctrl-v`
- **THEN** the editor enters visual block mode with the visual anchor at the current cursor position

#### Scenario: Block selection covers rectangular cells

- **WHEN** the editor is in visual block mode and the user moves the cursor to another line and column
- **THEN** the active selection covers only cells whose line is between the anchor and cursor lines and whose column is between the anchor and cursor columns

#### Scenario: Block selection handles ragged lines

- **WHEN** a visual block selection spans lines shorter than the selected columns
- **THEN** operations treat missing cells as empty slices and MUST NOT throw or move the cursor outside the prompt text

#### Scenario: Cancel visual block mode

- **WHEN** the editor is in visual block mode and the user presses `Escape`
- **THEN** visual selection clears and the editor returns to normal mode without changing prompt text

### Requirement: Visual block mode supports blockwise operations

The Vim editor SHALL apply yank, delete, change, and block insert commands to visual block selections using line-by-line rectangular text slices.

#### Scenario: Yank visual block selection

- **WHEN** the editor is in visual block mode and the user presses `y`
- **THEN** the selected rectangular text slices are copied to the unnamed character register joined by newline characters, visual selection clears, and the editor returns to normal mode

#### Scenario: Delete visual block selection

- **WHEN** the editor is in visual block mode and the user presses `d` or `x`
- **THEN** the selected rectangular text slices are removed from each affected line, copied to the unnamed character register joined by newline characters, visual selection clears, and the editor returns to normal mode

#### Scenario: Change visual block selection

- **WHEN** the editor is in visual block mode and the user presses `c`
- **THEN** the selected rectangular text slices are removed from each affected line, copied to the unnamed character register joined by newline characters, visual selection clears, and the editor enters insert mode

#### Scenario: Insert before visual block selection

- **WHEN** the editor is in visual block mode, the user presses `I`, types text, and presses `Escape`
- **THEN** the typed text is inserted at the block start column on every selected line and the editor returns to normal mode

#### Scenario: Append after visual block selection

- **WHEN** the editor is in visual block mode, the user presses `A`, types text, and presses `Escape`
- **THEN** the typed text is inserted after the block end column on every selected line and the editor returns to normal mode

### Requirement: Visual block selections are highlighted inline

The Vim editor SHALL render active visual block selections as visible rectangular inline highlights while preserving cursor visibility and terminal-width safety.

#### Scenario: Block selection highlighted

- **WHEN** the editor renders while visual block mode is active
- **THEN** only selected rectangular cells are styled with the visual selection highlight

#### Scenario: Cursor remains distinguishable in block selection

- **WHEN** the cursor is inside a highlighted visual block selection
- **THEN** the cursor rendering remains visually distinguishable from the block selection highlight

#### Scenario: Block highlight render width is safe

- **WHEN** Pi renders the editor at any supported terminal width while visual block mode is active
- **THEN** every rendered line from the Vim editor fits within the provided width

### Requirement: Visual modes can switch to block selection

The Vim editor SHALL allow switching between characterwise, linewise, and blockwise visual modes while preserving the current visual anchor.

#### Scenario: Switch from characterwise visual to visual block

- **WHEN** the editor is in characterwise visual mode and the user presses `Ctrl-v`
- **THEN** the editor switches to visual block mode, keeps the existing visual anchor, and keeps the current cursor position

#### Scenario: Switch from visual line to visual block

- **WHEN** the editor is in visual line mode and the user presses `Ctrl-v`
- **THEN** the editor switches to visual block mode, keeps the existing visual anchor, and keeps the current cursor position

#### Scenario: Enter visual block mode with configured command binding

- **WHEN** `piVimMode.keymap.commands.visualBlock` maps a printable key sequence or Vim-style modifier sequence such as `<C-v>` / `<A-x>` and the editor receives that sequence in normal or visual mode
- **THEN** the editor enters or switches to visual block mode while preserving any existing visual anchor

#### Scenario: Switch from visual block to characterwise visual

- **WHEN** the editor is in visual block mode and the user presses `v`
- **THEN** the editor switches to characterwise visual mode, keeps the existing visual anchor, and keeps the current cursor position

#### Scenario: Switch from visual block to visual line

- **WHEN** the editor is in visual block mode and the user presses `V`
- **THEN** the editor switches to visual line mode, keeps the existing visual anchor, and keeps the current cursor position

### Requirement: Visual block mode is documented and validated

The change SHALL include tests and documentation for visual block keybindings, rectangular selection rendering, and blockwise yank/delete/change behavior.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests for visual block selection math, commands, rendering, and modal editor behavior pass

#### Scenario: Typecheck runs

- **WHEN** the repository typecheck command is executed
- **THEN** the Vim mode extension compiles without TypeScript errors

#### Scenario: README documents visual block mode

- **WHEN** the user opens the project README
- **THEN** it documents `Ctrl-v`, visual block highlighting, and supported blockwise operations

