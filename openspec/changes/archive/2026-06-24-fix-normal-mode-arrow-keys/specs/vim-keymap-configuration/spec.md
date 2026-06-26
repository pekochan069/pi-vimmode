## MODIFIED Requirements

### Requirement: Semantic keymap configuration resolves supported Vim actions

The Vim editor SHALL read `piVimMode.keymap` as a semantic mapping for supported operators, motions, and commands while preserving the existing default keymap when no keymap config is provided. Directional motion defaults SHALL include physical arrow-key aliases for the same semantic left/down/up/right actions as `h`, `j`, `k`, and `l`.

#### Scenario: Default keymap preserved

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds the currently documented normal, visual, operator, motion, paste, open-line, join, and undo commands to their existing default keys

#### Scenario: Default directional arrow aliases available

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved motion keymap binds `left`, `down`, `up`, and `right` as aliases for the existing left/down/up/right motion actions

#### Scenario: Operator binding configured

- **WHEN** `piVimMode.keymap.operators.delete` is set to a valid key sequence and the editor is in normal mode
- **THEN** that key sequence starts the delete operator instead of requiring the default `d` key

#### Scenario: Motion binding configured

- **WHEN** `piVimMode.keymap.motions.wordForward` is set to a valid key sequence and the editor is in normal or visual mode
- **THEN** that key sequence performs the configured word-forward motion where word-forward is supported

#### Scenario: Command binding configured

- **WHEN** `piVimMode.keymap.commands.openLineBelow` is set to a valid key sequence and the editor is in normal mode
- **THEN** that key sequence inserts a blank line below the current line and enters insert mode

#### Scenario: Invalid keymap field falls back

- **WHEN** a `piVimMode.keymap` field has an unsupported type, protected key, or invalid action name
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable
