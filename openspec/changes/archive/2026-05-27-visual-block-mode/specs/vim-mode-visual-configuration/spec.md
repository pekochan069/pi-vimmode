## ADDED Requirements

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
