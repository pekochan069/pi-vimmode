## ADDED Requirements

### Requirement: Action keybinding presets resolve to finite action bindings

The Vim editor SHALL support `piVimMode.keymap.actionPresets` as an opt-in array of named built-in action keybinding presets that expand to canonical `piVimMode.keymap.actions` bindings before explicit action entries are resolved.

#### Scenario: No action presets by default

- **WHEN** the editor resolves default options without `piVimMode.keymap.actionPresets` or explicit `piVimMode.keymap.actions`
- **THEN** no prompt transform action keybindings are accepted by default

#### Scenario: Paragraph editing preset applies bindings

- **WHEN** settings configure `piVimMode.keymap.actionPresets` with `["paragraph-editing"]`
- **THEN** the resolved keymap accepts `prompt.transform.reflow` on `gq`, `prompt.transform.quote` on `g>`, and `prompt.transform.unquote` on `g<`

#### Scenario: Markdown wrapping preset applies bindings

- **WHEN** settings configure `piVimMode.keymap.actionPresets` with `["markdown-wrapping"]`
- **THEN** the resolved keymap accepts `prompt.transform.fence` on `gT` with no language arg, `prompt.transform.quote` on `g>`, and `prompt.transform.unquote` on `g<`

#### Scenario: Multiple presets merge in listed order

- **WHEN** settings configure `piVimMode.keymap.actionPresets` with `["paragraph-editing", "markdown-wrapping"]`
- **THEN** the resolved keymap contains the union of compatible preset bindings and later preset bindings replace earlier preset bindings for the same action ID

#### Scenario: Explicit actions override preset actions

- **WHEN** settings configure `piVimMode.keymap.actionPresets` with `["paragraph-editing"]` and also configure `piVimMode.keymap.actions.prompt.transform.quote` with an explicit keybinding entry
- **THEN** the explicit `prompt.transform.quote` entries replace the preset-provided quote entries while unrelated preset bindings remain accepted

#### Scenario: Explicit empty action array clears preset action

- **WHEN** settings configure `piVimMode.keymap.actionPresets` with `["paragraph-editing"]` and explicit `piVimMode.keymap.actions.prompt.transform.quote` as an empty array
- **THEN** the resolved keymap contains no accepted `prompt.transform.quote` binding from that preset and preserves unrelated preset bindings

#### Scenario: Project settings layer overrides global preset layer

- **WHEN** global settings configure an action preset and project settings configure explicit `piVimMode.keymap.actions` for one of the same action IDs
- **THEN** the project explicit action entries override the global preset entries for that action ID while valid unrelated global preset bindings remain available

#### Scenario: Invalid preset names preserve valid siblings

- **WHEN** `piVimMode.keymap.actionPresets` contains a supported preset ID and an unsupported preset ID
- **THEN** settings resolution records a warning for the unsupported preset ID, applies the supported preset ID, and continues resolving valid sibling settings

#### Scenario: Invalid preset shape is ignored safely

- **WHEN** `piVimMode.keymap.actionPresets` is not an array of strings
- **THEN** settings resolution records a warning, ignores the invalid preset value, and continues resolving valid sibling settings

#### Scenario: Preset bindings obey disabled transform validation

- **WHEN** `piVimMode.promptTransforms.actions.reflow` is false and `piVimMode.keymap.actionPresets` includes `paragraph-editing`
- **THEN** the preset-provided `prompt.transform.reflow` binding is rejected with a warning and valid preset bindings for enabled actions remain accepted

#### Scenario: Preset bindings obey keymap conflict validation

- **WHEN** a preset-provided key sequence conflicts with a configured grammar binding or another action binding during resolution
- **THEN** the conflicting preset-provided action binding is rejected with the same warning style as explicit `piVimMode.keymap.actions` entries
