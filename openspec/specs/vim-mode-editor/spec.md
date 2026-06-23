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

The Vim editor SHALL start in insert mode and MUST delegate ordinary text entry, autocomplete rendering, and Pi editor behavior to the default editor implementation.

#### Scenario: User types in insert mode

- **WHEN** the editor is in insert mode and the user types printable text
- **THEN** the text is inserted exactly as the default Pi editor would insert it

#### Scenario: User exits insert mode

- **WHEN** the editor is in insert mode and the user presses `Esc`
- **THEN** the editor enters normal mode without submitting the prompt or aborting the agent

#### Scenario: Insert mode autocomplete remains usable

- **WHEN** the editor is in insert mode and Pi autocomplete or slash-command completion is active
- **THEN** completion navigation, selection, and text insertion continue to use Pi's default editor behavior

#### Scenario: Insert mode autocomplete rows remain visible with Vim status

- **WHEN** the editor is in insert mode and Pi autocomplete or slash-command completion renders one or more visible completion rows
- **THEN** pi-vimmode preserves the completion rows and does not replace them with Vim status feedback

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

The Vim editor SHALL render Vim status feedback according to the resolved UI configuration and MUST keep every rendered line within the terminal width. With no UI configuration, the current `INSERT`, `NORMAL`, `VISUAL`, and `V-LINE` feedback remains visible, including while Pi autocomplete or slash-command completion is active.

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

#### Scenario: Autocomplete popup does not hide mode feedback

- **WHEN** the editor is in insert mode, Pi autocomplete or slash-command completion is active, and the resolved UI configuration shows the mode status item
- **THEN** the rendered editor keeps the active mode feedback visible without hiding the completion UI

#### Scenario: Single-row autocomplete keeps insert feedback visible

- **WHEN** the editor is in insert mode and Pi autocomplete or slash-command completion has only one visible completion row
- **THEN** the rendered editor still shows `INSERT` feedback where width permits

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
- **THEN** it documents install/loading instructions, links to the supported keymap and limitations, and includes validation commands

### Requirement: Normal mode supports redo after undo

The Vim editor SHALL support normal-mode redo for the most recent prompt text/cursor state undone by normal-mode undo, without changing extension-local registers, marks, macro state, or dot-repeat state.

#### Scenario: Redo restores the most recent undone prompt edit

- **WHEN** the editor is in normal mode after `u` successfully undoes a prompt text edit and the user presses `Ctrl+R`
- **THEN** the editor restores the text and cursor state from before that undo and remains in normal mode

#### Scenario: Redo without an undone edit is safe

- **WHEN** the editor is in normal mode with no redo state available and the user presses `Ctrl+R`
- **THEN** prompt text, cursor position, registers, marks, dot-repeat state, and mode remain unchanged

#### Scenario: New text edit clears redo branch

- **WHEN** the editor is in normal mode after `u` creates redo state and the user performs another successful text-changing edit before pressing `Ctrl+R`
- **THEN** `Ctrl+R` does not restore the stale undone branch and the current prompt text remains unchanged by redo

#### Scenario: Movement before redo preserves redo state

- **WHEN** the editor is in normal mode after `u` creates redo state and the user moves the cursor without changing prompt text before pressing `Ctrl+R`
- **THEN** redo remains available and restores the undone prompt text state

#### Scenario: Insert mode remains delegated

- **WHEN** the editor is in insert mode and the user presses `Ctrl+R`
- **THEN** the key is delegated to Pi's default editor behavior unless pi-vimmode explicitly supports insert-mode `Ctrl+R` in a future change

### Requirement: Redo behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for redo behavior and current limitations.

#### Scenario: Automated validation covers redo

- **WHEN** `bun test` is executed
- **THEN** tests cover redo after undo, redo without state, redo branch clearing after new edits, movement before redo, insert-mode delegation, and existing undo behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents redo

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents normal-mode `Ctrl+R` redo, redo limitations, and the fact that pi-vimmode does not implement a Vim undo tree

### Requirement: Configured escape aliases leave insert, visual, and Ex command-line states

The Vim editor SHALL treat configured `piVimMode.keymap.escape` sequences as aliases for physical `Esc` in insert mode when autocomplete is inactive, in visual modes, and while an Ex command-line is pending, while preserving default insert-mode delegation for all unrelated input.

#### Scenario: Configured alias exits insert mode

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>`, autocomplete is inactive, and the editor is in insert mode
- **THEN** pressing the corresponding modified `j` key enters normal mode and does not insert text into the prompt

#### Scenario: Physical escape remains supported

- **WHEN** the editor is in insert mode and the user presses physical `Esc`
- **THEN** the editor follows existing behavior and enters normal mode when autocomplete is inactive

#### Scenario: Unrelated insert text remains delegated

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>` and the editor receives ordinary insert-mode text
- **THEN** the text is delegated to Pi's default editor behavior and inserted normally

#### Scenario: Raw text chords remain text

- **WHEN** `piVimMode.keymap.escape` is configured with raw text such as `jk`
- **THEN** the invalid alias is ignored, typing `j` followed by `k` inserts `jk`, and the editor remains in insert mode

#### Scenario: Alias does not fire while autocomplete is open

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>`, Pi autocomplete is open, and the editor is in insert mode
- **THEN** pressing the configured modified key delegates to Pi autocomplete/default editing behavior instead of entering normal mode

#### Scenario: Configured alias exits visual modes

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>` and the editor is in visual, visual-line, or visual-block mode
- **THEN** pressing the corresponding modified key cancels visual selection and enters normal mode like physical `Esc`

#### Scenario: Configured alias cancels pending Ex command-line

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>` and the editor has a pending `:` Ex command-line
- **THEN** pressing the corresponding modified key cancels the pending Ex command-line like physical `Esc` without delegating to Pi

#### Scenario: Normal mode keeps existing key behavior

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>` and the editor is in normal mode
- **THEN** existing normal-mode behavior remains unchanged and the escape alias is not evaluated

### Requirement: Insert escape aliases preserve modal side effects

The Vim editor SHALL integrate insert escape alias handling with existing modal state, adapter fast-path, macro, redo, and render boundaries without changing default behavior when aliases are absent.

#### Scenario: Fast path remains safe

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>`
- **THEN** ordinary insert text may still use the guarded insert fast path, while configured alias input is routed through modal handling

#### Scenario: Macro recording preserves alias behavior

- **WHEN** macro recording is active and the user records insert text followed by a configured insert escape alias
- **THEN** replaying the macro reproduces the same inserted text and mode transition without inserting escape alias text

#### Scenario: Redo and search state remain consistent

- **WHEN** insert escape alias handling routes input through modal handling
- **THEN** redo history, search highlights, transient messages, visual state, registers, marks, and cursor styling follow the same side-effect rules as equivalent existing insert-mode delegation and physical `Esc` transitions

#### Scenario: Default behavior is unchanged without aliases

- **WHEN** no `piVimMode.keymap.escape` setting is configured
- **THEN** insert-mode typing, physical `Esc`, autocomplete, Pi shortcuts, macro recording/replay, and fast-path delegation behave as they did before this change

#### Scenario: Automated validation covers insert escape behavior

- **WHEN** `bun test` is executed
- **THEN** tests cover alias success, raw text rejection, autocomplete preservation, visual mode escape, normal-mode non-participation, macro recording/replay, fast-path guarding, and default behavior without aliases

### Requirement: Insert mode supports configured line opening

The Vim editor SHALL support opt-in insert-mode line-opening commands that open a blank prompt line above or below the current line while preserving insert mode and default Pi delegation for unconfigured input.

#### Scenario: Default insert mode remains delegated

- **WHEN** the editor is in insert mode with no configured insert newline binding and receives a non-escape key such as `Ctrl+J`
- **THEN** the input delegates to Pi/default insert behavior and prompt text is not changed by pi-vimmode line-opening logic

#### Scenario: Configured insert command opens line below

- **WHEN** the editor is in insert mode, autocomplete is inactive, `piVimMode.keymap.insert.openLineBelow` includes `ctrl+j`, and the user presses `Ctrl+J`
- **THEN** a blank line is inserted below the current prompt line, the cursor moves to that blank line, and the editor remains in insert mode

#### Scenario: Configured insert command opens line above

- **WHEN** the editor is in insert mode, autocomplete is inactive, `piVimMode.keymap.insert.openLineAbove` includes `ctrl+k`, and the user presses `Ctrl+K`
- **THEN** a blank line is inserted above the current prompt line, the cursor moves to that blank line, and the editor remains in insert mode

#### Scenario: Empty prompt stays editable

- **WHEN** the editor is in insert mode with an empty prompt and receives a configured insert newline binding
- **THEN** the prompt remains editable with the cursor on a blank line in insert mode

#### Scenario: Autocomplete keeps Pi ownership

- **WHEN** the editor is in insert mode, Pi autocomplete or slash-command completion is active, and the user presses a configured insert newline binding
- **THEN** the input delegates to Pi/default autocomplete behavior instead of opening a prompt line through pi-vimmode

#### Scenario: Insert line opening preserves modal side state boundaries

- **WHEN** a configured insert newline binding successfully changes prompt text
- **THEN** search highlights clear like other prompt text edits, and registers, marks, visual state, macro slots, dot-repeat state, and mode remain otherwise unchanged
