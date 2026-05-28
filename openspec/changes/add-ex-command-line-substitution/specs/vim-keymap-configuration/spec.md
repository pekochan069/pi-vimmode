## ADDED Requirements

### Requirement: Ex command-line entry is configurable

The Vim keymap configuration SHALL expose Ex command-line entry as a semantic normal/visual command while preserving the default `:` binding.

#### Scenario: Default Ex command-line key is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode
- **THEN** pressing `:` enters Ex command-line mode

#### Scenario: Configured Ex command-line key is used

- **WHEN** `piVimMode.keymap.commands.startExCommand` is set to a valid key sequence and the editor is in normal mode
- **THEN** that key sequence enters Ex command-line mode instead of requiring the default `:` key

#### Scenario: Ex command-line key works from visual modes

- **WHEN** `piVimMode.keymap.commands.startExCommand` is set to a valid key sequence and the editor is in a visual mode with an active selection
- **THEN** that key sequence enters Ex command-line mode with the visual range marker prefilled

#### Scenario: Insert mode remains Pi-owned for Ex entry key

- **WHEN** the editor is in insert mode and the user presses `:` or a configured Ex command-line key
- **THEN** input delegates to Pi default editor behavior unless that insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Protected key binding is rejected for Ex command-line entry

- **WHEN** `piVimMode.keymap.commands.startExCommand` attempts to bind a protected Pi-owned shortcut
- **THEN** the binding is ignored or rejected with a warning and the protected shortcut continues to delegate to Pi behavior

#### Scenario: Count before Ex command-line key prefills range

- **WHEN** the editor is in normal mode with a pending numeric count and receives the resolved Ex command-line entry key
- **THEN** Ex command-line mode opens with a concrete clamped numeric range derived from the current prompt line and count
