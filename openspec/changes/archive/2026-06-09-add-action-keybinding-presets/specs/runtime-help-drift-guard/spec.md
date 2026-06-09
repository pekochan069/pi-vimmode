## ADDED Requirements

### Requirement: Runtime help discovers action keybinding presets

The Vim editor SHALL expose source-backed runtime discovery for named action keybinding presets without adding a command palette, plugin API, runtime mapping command, or default binding behavior.

#### Scenario: Features query finds action presets

- **WHEN** the editor executes `:features keybindings`, `:features action presets`, or a supported action preset name query
- **THEN** it reports available action keybinding presets and names the `piVimMode.keymap.actionPresets` setting surface

#### Scenario: Features output includes concrete preset bindings

- **WHEN** runtime feature discovery reports action keybinding presets
- **THEN** the output includes concrete preset IDs, action IDs, and key sequences such as `paragraph-editing`, `prompt.transform.reflow` on `gq`, `prompt.transform.quote` on `g>`, and `prompt.transform.unquote` on `g<`

#### Scenario: Features output keeps presets opt-in

- **WHEN** runtime feature discovery reports action keybinding presets
- **THEN** it states or implies that presets are opt-in and create no default bindings, plugin actions, diagnostic/help keybinding dispatch, or generic command palette behavior

#### Scenario: Unknown preset query remains finite

- **WHEN** the editor executes `:features` with an unsupported preset, unsupported recipe, or unsupported Vim mapping query
- **THEN** it shows the existing finite no-match response instead of inventing full Vim/Neovim mapping behavior

### Requirement: Drift guard validates action keybinding presets

The project SHALL validate source-backed action keybinding presets against docs, config parsing, runtime help, specs, and tests before the change is considered complete.

#### Scenario: Preset docs anchor missing fails validation

- **WHEN** source-backed preset metadata names a user-facing docs anchor and the docs lack that anchor
- **THEN** the docs drift guard fails with an actionable message identifying the missing preset docs anchor

#### Scenario: Preset config stops parsing fails validation

- **WHEN** a source-backed action keybinding preset no longer resolves through `resolveVimOptions` without unexpected warnings
- **THEN** automated validation fails before the preset can be considered selectable

#### Scenario: Preset runtime output is tested

- **WHEN** runtime feature discovery exposes action keybinding presets
- **THEN** automated runtime-help tests verify the query output includes expected preset IDs, action IDs, key sequences, setting name, and opt-in wording

#### Scenario: Preset action IDs stay registry-backed

- **WHEN** a preset references a `prompt.transform.*` action ID
- **THEN** automated drift validation verifies that action ID exists in the bindable prompt transform action registry and user docs mention its docs anchor

#### Scenario: Preset and recipe metadata stay aligned

- **WHEN** a preset is backed by an existing action keybinding recipe
- **THEN** automated drift validation verifies that the preset and recipe share the intended action IDs, key sequences, docs anchors or cross-links, and expected resolved bindings
