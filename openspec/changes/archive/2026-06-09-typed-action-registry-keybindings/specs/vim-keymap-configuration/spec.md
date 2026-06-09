## ADDED Requirements

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

#### Scenario: Legacy action alias is rejected in config

- **WHEN** settings configure a legacy action ID such as `promptTransform.reflow` under `piVimMode.keymap.actions`
- **THEN** that entry is ignored, a warning names the canonical `prompt.transform.reflow` ID, and diagnostics search aliases remain available

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

### Requirement: Action binding conflicts are rejected before dispatch

The Vim editor SHALL precompute accepted action bindings and diagnostics warnings for rejected entries so rejected action keys never dispatch at runtime.

#### Scenario: Action conflicts with existing grammar binding

- **WHEN** an action binding uses a key sequence already claimed by a resolved operator, motion, command, macro, mark, or text-object grammar binding
- **THEN** that action key entry is rejected with a warning, the existing grammar binding keeps its behavior, and the action can use that key only after the existing binding is explicitly unbound

#### Scenario: Action prefix would shadow existing grammar

- **WHEN** an action binding is a strict prefix of an existing grammar sequence, or an existing executable grammar sequence is a strict prefix of the action binding
- **THEN** that action key entry is rejected with a warning so neither action dispatch nor existing grammar dispatch is shadowed

#### Scenario: Action shares non-executable prefix with existing grammar

- **WHEN** an action binding and an existing grammar binding share a common prefix that is not itself an executable grammar binding, such as `gq` and `gg`
- **THEN** both bindings remain valid and the shared prefix waits for the next key

#### Scenario: Same action repeats the same key

- **WHEN** one action binding list contains the same key sequence more than once
- **THEN** the resolved keymap keeps one accepted binding and does not emit a duplicate warning for that same-action repetition

#### Scenario: Two actions claim the same key

- **WHEN** two different action IDs claim the same key sequence
- **THEN** both conflicting action key entries are rejected and the warning names both action IDs

#### Scenario: Non-conflicting key for same action remains accepted

- **WHEN** one key entry for an action conflicts and another key entry for the same action does not
- **THEN** only the conflicting key entry is rejected and the non-conflicting key entry remains accepted

#### Scenario: Mapcheck can explain rejected action key

- **WHEN** a key sequence was rejected from `piVimMode.keymap.actions` and the user executes `:mapcheck` for that key
- **THEN** the diagnostic reports that the action key was rejected and includes the reason when available
