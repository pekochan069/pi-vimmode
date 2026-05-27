# vim-mode-editor Specification

## Purpose

TBD - created by archiving change add-vim-mode-extension. Update Purpose after archive.

## Requirements

### Requirement: Extension replaces Pi prompt editor

The extension SHALL register a `CustomEditor`-based Vim editor for Pi sessions without requiring changes to Pi core.

#### Scenario: Extension session starts

- **WHEN** Pi starts a session with the extension enabled
- **THEN** the main prompt editor uses the Vim editor component

#### Scenario: Extension is disabled

- **WHEN** the user removes or disables the extension
- **THEN** Pi uses its default prompt editor with no persisted migration required

### Requirement: Insert mode preserves default editing

The Vim editor SHALL start in insert mode and MUST delegate ordinary text entry and Pi editor behavior to the default editor implementation.

#### Scenario: User types in insert mode

- **WHEN** the editor is in insert mode and the user types printable text
- **THEN** the text is inserted exactly as the default Pi editor would insert it

#### Scenario: User exits insert mode

- **WHEN** the editor is in insert mode and the user presses `Esc`
- **THEN** the editor enters normal mode without submitting the prompt or aborting the agent

#### Scenario: Insert mode autocomplete remains usable

- **WHEN** the editor is in insert mode and Pi autocomplete or slash-command completion is active
- **THEN** completion navigation, selection, and text insertion continue to use Pi's default editor behavior

### Requirement: Normal mode supports core Vim navigation

The Vim editor SHALL support core normal-mode cursor movement across the current prompt.

#### Scenario: Character navigation

- **WHEN** the editor is in normal mode and the user presses `h`, `j`, `k`, or `l`
- **THEN** the cursor moves left, down, up, or right respectively when movement is possible

#### Scenario: Line boundary navigation

- **WHEN** the editor is in normal mode and the user presses `0` or `$`
- **THEN** the cursor moves to the current line start or line end respectively

#### Scenario: Word navigation

- **WHEN** the editor is in normal mode and the user presses `w` or `b`
- **THEN** the cursor moves to the next or previous word boundary respectively

#### Scenario: Unmapped printable key

- **WHEN** the editor is in normal mode and the user presses an unmapped printable key
- **THEN** the key is ignored and no text is inserted

### Requirement: Normal mode supports core Vim editing

The Vim editor SHALL support practical normal-mode editing commands using an extension-local unnamed register.

#### Scenario: Enter insert from normal mode

- **WHEN** the editor is in normal mode and the user presses `i`, `a`, `I`, or `A`
- **THEN** the editor enters insert mode at the current cursor, after the current cursor, at line start, or at line end respectively

#### Scenario: Delete character under cursor

- **WHEN** the editor is in normal mode and the user presses `x`
- **THEN** the character under the cursor is deleted when one exists

#### Scenario: Delete current line

- **WHEN** the editor is in normal mode and the user presses `dd`
- **THEN** the current line is removed, the removed text is stored in the unnamed register as linewise text, and the prompt remains editable

#### Scenario: Yank and paste current line

- **WHEN** the editor is in normal mode and the user presses `yy` followed by `p`
- **THEN** the current line is copied to the unnamed register and pasted after the current line

#### Scenario: Undo delegates to Pi editor

- **WHEN** the editor is in normal mode and the user presses `u`
- **THEN** the editor invokes Pi's default undo behavior

### Requirement: Visual mode supports characterwise selection operations

The Vim editor SHALL provide characterwise visual mode with an anchor, selectable range, and selection operations.

#### Scenario: Enter visual mode

- **WHEN** the editor is in normal mode and the user presses `v`
- **THEN** the editor enters visual mode and anchors selection at the current cursor position

#### Scenario: Extend visual selection

- **WHEN** the editor is in visual mode and the user uses supported motion keys
- **THEN** the selection range extends from the anchor to the current cursor position

#### Scenario: Yank visual selection

- **WHEN** the editor is in visual mode and the user presses `y`
- **THEN** the selected text is copied to the unnamed register, visual selection clears, and the editor returns to normal mode

#### Scenario: Delete visual selection

- **WHEN** the editor is in visual mode and the user presses `d` or `x`
- **THEN** the selected text is removed, copied to the unnamed register, visual selection clears, and the editor returns to normal mode

#### Scenario: Change visual selection

- **WHEN** the editor is in visual mode and the user presses `c`
- **THEN** the selected text is removed, copied to the unnamed register, visual selection clears, and the editor enters insert mode

#### Scenario: Cancel visual mode

- **WHEN** the editor is in visual mode and the user presses `Esc`
- **THEN** visual selection clears and the editor returns to normal mode

### Requirement: Mode feedback is visible and width-safe

The Vim editor SHALL display current mode feedback without producing rendered lines wider than the terminal width.

#### Scenario: Mode label updates

- **WHEN** the editor switches between insert, normal, and visual modes
- **THEN** the rendered editor shows `INSERT`, `NORMAL`, or `VISUAL` feedback matching the active mode

#### Scenario: Render width respected

- **WHEN** Pi renders the editor with any supported terminal width
- **THEN** every rendered line from the editor fits within the provided width

#### Scenario: Visual selection status shown

- **WHEN** the editor is in visual mode with a non-empty selection
- **THEN** the rendered feedback includes a visible indication of visual mode and selection size or range

### Requirement: Pi application shortcuts remain compatible

The Vim editor MUST preserve Pi application-level shortcuts and safety behavior.

#### Scenario: Normal-mode escape delegates to Pi

- **WHEN** the editor is in normal mode and the user presses `Esc`
- **THEN** the key is delegated to Pi so interrupt or abort behavior still works

#### Scenario: Control shortcut delegated

- **WHEN** the user presses Pi control shortcuts such as `Ctrl+C`, `Ctrl+D`, `Ctrl+G`, model selection shortcuts, thinking shortcuts, or image paste shortcuts
- **THEN** the editor delegates the shortcut to Pi unless the shortcut is explicitly implemented by this extension

#### Scenario: Prompt submission remains available

- **WHEN** the editor is in insert mode and the user presses Pi's configured submit key
- **THEN** the prompt submits according to Pi's default input behavior

### Requirement: Vim behavior is covered by tests and documentation

The change SHALL include automated tests for pure Vim editing logic and user-facing documentation for supported behavior.

#### Scenario: Text operation tests run

- **WHEN** `bun test` is executed
- **THEN** buffer transformation, selection range, register, and command parsing tests pass

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: User reads README

- **WHEN** the user opens the project README
- **THEN** it documents install/loading instructions, supported keymap, validation commands, and v1 limitations
