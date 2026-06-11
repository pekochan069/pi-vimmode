## ADDED Requirements

### Requirement: Metadata-only diagnostic actions are excluded from keybinding config

The Vim editor SHALL keep diagnostic/help action metadata separate from the bindable prompt transform action registry used by `piVimMode.keymap.actions`.

#### Scenario: Diagnostic action ID is rejected in keymap actions config

- **WHEN** settings configure `piVimMode.keymap.actions` with a metadata-only diagnostic/help ID such as `vimmode.doctor`, `vimmode.actions`, `vimmode.help`, or `vimmode.features`
- **THEN** the setting is rejected with a warning, no keybinding dispatch is installed for that ID, and valid sibling `prompt.transform.*` bindings are preserved

#### Scenario: Diagnostic action key sequence does not dispatch

- **WHEN** a metadata-only diagnostic/help ID appears in source-backed discovery metadata
- **THEN** pressing any user-configured key sequence cannot execute that diagnostic/help action unless a future capability explicitly adds a supported binding surface

#### Scenario: Bindable action ID set remains prompt-transform-only

- **WHEN** config validation, command resolution, or tests enumerate accepted bindable action IDs
- **THEN** the accepted set contains only canonical `prompt.transform.*` IDs for supported prompt transforms and excludes `vimmode.*` diagnostic/help metadata IDs

### Requirement: Legacy promptTransform aliases remain diagnostics-only during transition

The Vim editor SHALL preserve legacy `promptTransform.*` aliases for diagnostic/search compatibility until the planned one-release-cycle transition ends, while rejecting those aliases from keybinding config.

#### Scenario: Legacy alias remains searchable

- **WHEN** the editor executes `:actions promptTransform.reflow` or `:features promptTransform.reflow` during the transition release
- **THEN** the diagnostic resolves the alias to canonical `prompt.transform.reflow` output

#### Scenario: Legacy alias is rejected in config

- **WHEN** settings configure `piVimMode.keymap.actions` with a legacy ID such as `promptTransform.reflow`
- **THEN** the entry is rejected with a warning that names the canonical `prompt.transform.reflow` ID and accepted sibling bindings remain active

#### Scenario: Alias transition is covered by validation

- **WHEN** automated docs/source drift validation runs during the transition release
- **THEN** it verifies that docs mention the temporary `promptTransform.*` diagnostic alias behavior and that tests cover canonical output for legacy alias queries
