## MODIFIED Requirements

### Requirement: Action keymap configuration binds finite prompt transform actions

The Vim editor SHALL support `piVimMode.keymap.actions` as an additive semantic keymap group for finite bindable prompt transform actions.

#### Scenario: No action keybindings by default

- **WHEN** the editor resolves default options without explicit `piVimMode.keymap.actions`
- **THEN** no prompt transform action keybindings are accepted by default

#### Scenario: String action binding is accepted

- **WHEN** settings configure `piVimMode.keymap.actions` with `{ "prompt.transform.reflow": ["gq"] }`
- **THEN** the resolved keymap accepts `gq` as a binding for `prompt.transform.reflow` with default args

#### Scenario: Object action binding with args is accepted

- **WHEN** settings configure `piVimMode.keymap.actions` with `{ "prompt.transform.fence": [{ "key": "gT", "args": { "language": "ts" } }] }`
- **THEN** the resolved keymap accepts `gT` with the `language` arg attached to that binding

#### Scenario: Object action binding without args is accepted

- **WHEN** settings configure `piVimMode.keymap.actions` with `{ "prompt.transform.reflow": [{ "key": "gq" }] }`
- **THEN** the resolved keymap accepts `gq` as a binding for `prompt.transform.reflow` with default args

#### Scenario: Unknown action ID is ignored

- **WHEN** settings configure an unsupported action ID under `piVimMode.keymap.actions`
- **THEN** that entry is ignored, a warning is recorded, and sibling action bindings remain usable

#### Scenario: Legacy-style action ID is rejected as unsupported

- **WHEN** settings configure a legacy-style action ID such as `promptTransform.reflow` under `piVimMode.keymap.actions`
- **THEN** that entry is ignored as an unsupported action ID, no keybinding dispatch is installed for it, and valid sibling canonical bindings remain usable

#### Scenario: Invalid action args are ignored per binding

- **WHEN** settings configure `{ "prompt.transform.reflow": ["gq", { "key": "gQ", "args": { "width": "wide" } }] }`
- **THEN** the invalid `gQ` binding entry is ignored, a warning is recorded, and the valid `gq` binding remains usable

#### Scenario: Protected action key is rejected

- **WHEN** `piVimMode.keymap.actions` attempts to bind a Pi-owned protected shortcut such as `ctrl+p`
- **THEN** that key entry is rejected with a warning and the shortcut continues to delegate to Pi behavior

#### Scenario: Disabled prompt transform rejects action keybindings

- **WHEN** `piVimMode.promptTransforms.actions.reflow` is false and `piVimMode.keymap.actions` binds `prompt.transform.reflow`
- **THEN** the reflow action key entries are ignored with a warning and `:reflow` remains unsupported

#### Scenario: Disabled prompt transform suite rejects all action keybindings

- **WHEN** `piVimMode.promptTransforms.enabled` is false and `piVimMode.keymap.actions` binds any `prompt.transform.*` action
- **THEN** all prompt transform action key entries are ignored with warnings and prompt transform Ex commands remain unsupported

#### Scenario: Project action bindings replace global bindings per action ID

- **WHEN** global settings bind an action and project settings configure the same action ID with a different binding list
- **THEN** the project binding list replaces the global list for that action ID before conflict resolution

#### Scenario: Empty action binding list unbinds scoped action

- **WHEN** project settings configure an action ID as an empty array
- **THEN** the resolved keymap has no accepted bindings for that action from the replaced scope
