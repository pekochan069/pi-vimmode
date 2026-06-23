## ADDED Requirements

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
