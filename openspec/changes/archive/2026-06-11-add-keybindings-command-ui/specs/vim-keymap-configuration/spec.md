## ADDED Requirements

### Requirement: Keybindings popup command participates in semantic keymap configuration

The Vim keymap configuration SHALL expose a finite semantic command for opening the keybindings popup while preserving existing protected-shortcut, conflict, and insert-mode delegation rules.

#### Scenario: Keybindings popup command has no default binding

- **WHEN** Pi starts with no `piVimMode.keymap.commands.showKeybindings` setting
- **THEN** no normal-mode key sequence opens the keybindings popup by default and existing default bindings remain unchanged

#### Scenario: Configured keybindings popup command opens popup

- **WHEN** `piVimMode.keymap.commands.showKeybindings` is set to a valid non-conflicting key sequence and the editor is in normal mode
- **THEN** pressing that key sequence opens the same bounded read-only popup as `:keybindings`

#### Scenario: Configured keybindings popup command is read-only

- **WHEN** the configured keybindings popup command opens the popup from normal mode
- **THEN** prompt text, cursor position, registers, marks, macros, search state, resolved options, retained diagnostics, and dot-repeat state remain unchanged except for displaying the popup

#### Scenario: Insert mode remains Pi-owned for configured key

- **WHEN** the editor is in insert mode and the user presses a key sequence configured for `showKeybindings`
- **THEN** input delegates to Pi default editor behavior unless that insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Protected key binding is rejected

- **WHEN** `piVimMode.keymap.commands.showKeybindings` attempts to bind a protected Pi-owned shortcut such as `ctrl+p`, `enter`, or `tab`
- **THEN** the binding is ignored or rejected with a warning and the protected shortcut continues to delegate to Pi behavior

#### Scenario: Conflicting keybinding is rejected

- **WHEN** `piVimMode.keymap.commands.showKeybindings` attempts to use a key sequence that exactly conflicts with or prefix-shadows an existing resolved grammar binding
- **THEN** the invalid binding is ignored or rejected with a warning and the existing grammar binding keeps its behavior

#### Scenario: Live editor uses resolved keybindings popup command

- **WHEN** a live `VimEditor` is constructed with resolved options that include `commands.showKeybindings`
- **THEN** the editor uses that binding without dropping other command, motion, operator, macro, mark, search, UI, or prompt-transform options

### Requirement: Diagnostic metadata remains separate from keymap commands

The keymap configuration SHALL keep the new keybindings popup command separate from metadata-only diagnostic/help action IDs and prompt transform action bindings.

#### Scenario: Metadata IDs are not accepted as action keybindings

- **WHEN** settings configure `piVimMode.keymap.actions` with a metadata ID such as `vimmode.keybindings`, `vimmode.keymap`, or `vimmode.help`
- **THEN** that entry is ignored with a warning and no user keybinding dispatch is created for the metadata ID

#### Scenario: Prompt transform action bindings keep existing scope

- **WHEN** settings configure valid `piVimMode.keymap.actions` entries for `prompt.transform.*` IDs while also configuring `commands.showKeybindings`
- **THEN** prompt transform action bindings continue to dispatch prompt transforms, and `showKeybindings` opens only the keybindings popup
