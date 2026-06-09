## ADDED Requirements

### Requirement: Diagnostics describe prompt transform action keybindings

Runtime customization diagnostics SHALL report canonical prompt transform action IDs, accepted bindings, rejected action binding warnings, and temporary legacy aliases.

#### Scenario: Actions diagnostic shows canonical transform action ID

- **WHEN** the editor executes `:actions reflow` after `prompt.transform.reflow` is available
- **THEN** the diagnostic reports `prompt.transform.reflow` with its current binding state and transform description

#### Scenario: Legacy promptTransform alias remains searchable

- **WHEN** the editor executes `:actions promptTransform.reflow` during the alias transition period
- **THEN** the diagnostic resolves the query to the canonical `prompt.transform.reflow` action

#### Scenario: Keymap diagnostic lists action keybindings

- **WHEN** the editor executes `:keymap prompt.transform.reflow`
- **THEN** the diagnostic reports accepted keymap action bindings for `prompt.transform.reflow` and prints the canonical action ID exactly

#### Scenario: Mapcheck reports accepted action binding

- **WHEN** `gq` is an accepted binding for `prompt.transform.reflow` and the editor executes `:mapcheck gq`
- **THEN** the diagnostic reports that `gq` maps to `prompt.transform.reflow` without adding a duplicate `promptTransform.` kind prefix

#### Scenario: Vimdoctor reports action binding warnings

- **WHEN** settings contain rejected action key entries
- **THEN** `:vimdoctor` includes action binding warnings in the retained diagnostics summary

#### Scenario: Features query reports action keybindings

- **WHEN** `gq` is an accepted binding for `prompt.transform.reflow` and the editor executes `:features reflow`
- **THEN** the feature summary includes the reflow enabled state, Ex command names, and a compact action keybinding summary such as `keys=gq`

#### Scenario: Diagnostic commands remain read-only

- **WHEN** the editor executes `:actions`, `:keymap`, `:mapcheck`, or `:vimdoctor` for action keybindings
- **THEN** prompt text, cursor position, mode, visual selection, search highlights, registers, marks, macros, and dot-repeat state remain unchanged except for diagnostic messages
