## ADDED Requirements

### Requirement: Visual reselection participates in semantic keymap configuration

The Vim keymap configuration SHALL expose visual reselection as a finite semantic command action with a default `gv` binding.

#### Scenario: Default visual reselection keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode with a valid stored last visual selection
- **THEN** pressing `gv` reselects the stored visual selection

#### Scenario: Configured visual reselection key executes

- **WHEN** `piVimMode.keymap.commands.reselectVisual` is set to a valid finite key sequence and the editor is in normal mode with a valid stored last visual selection
- **THEN** pressing that configured key sequence reselects the stored visual selection

#### Scenario: Invalid visual reselection keymap falls back safely

- **WHEN** `piVimMode.keymap.commands.reselectVisual` is configured with an unsupported value or protected key sequence
- **THEN** that invalid binding is ignored, a warning is recorded, and valid sibling keymap fields remain usable

#### Scenario: Visual reselection is normal-mode only

- **WHEN** the editor is in insert mode or an active visual mode
- **THEN** the `reselectVisual` command binding does not steal ordinary insert input or replace existing visual-mode key handling
