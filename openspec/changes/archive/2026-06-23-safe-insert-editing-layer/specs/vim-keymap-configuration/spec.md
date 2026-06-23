## ADDED Requirements

### Requirement: Insert edit and navigation bindings are configurable

The Vim keymap configuration SHALL accept opt-in insert-mode edit and navigation bindings for finite supported actions while preserving insert-mode Pi delegation by default.

#### Scenario: Default insert edit keymap is empty

- **WHEN** Pi starts with no `piVimMode.keymap.insert` setting
- **THEN** the resolved keymap has no insert-mode edit, navigation, or line-opening bindings and ordinary insert-mode input continues to delegate to Pi

#### Scenario: Insert edit bindings are accepted

- **WHEN** `piVimMode.keymap.insert.deleteWordBackward`, `deleteWordForward`, `deleteLineBackward`, or `deleteLineForward` contains a valid modified key such as `ctrl+w`, `alt+d`, `ctrl+u`, or `ctrl+k`
- **THEN** the resolved keymap records that key for the configured insert edit action without changing normal-mode command, motion, operator, or prompt-transform bindings

#### Scenario: Insert movement bindings are accepted

- **WHEN** `piVimMode.keymap.insert.moveWordBackward`, `moveWordForward`, `moveLineStart`, or `moveLineEnd` contains a valid modified key such as `alt+b`, `alt+f`, `ctrl+a`, or `ctrl+e`
- **THEN** the resolved keymap records that key for the configured insert movement action without changing normal-mode command, motion, operator, or prompt-transform bindings

#### Scenario: Raw printable insert bindings are rejected

- **WHEN** `piVimMode.keymap.insert.deleteWordBackward` or another insert action contains raw printable text such as `j`, `jk`, `jj`, or `oo`
- **THEN** that binding is ignored with a warning and valid sibling insert and normal/visual keymap fields remain usable

#### Scenario: Protected insert binding requires same-layer allow-list

- **WHEN** `piVimMode.keymap.insert.deleteLineForward` contains a protected Pi shortcut such as `enter` and the same settings layer does not include it in `piVimMode.keymap.allowProtectedOverrides`
- **THEN** the binding is rejected with a protected-key warning and that shortcut continues to delegate to Pi behavior

#### Scenario: Duplicate insert binding is diagnosed

- **WHEN** two different `piVimMode.keymap.insert` actions claim the same normalized key sequence
- **THEN** the resolved keymap remains deterministic, a warning names both insert actions, and session startup continues

#### Scenario: Configured insert action dispatches only in insert mode

- **WHEN** an accepted insert edit or movement binding is pressed in insert mode while autocomplete is inactive
- **THEN** pi-vimmode performs the configured prompt-local insert action instead of delegating that key to Pi

#### Scenario: Autocomplete keeps ownership

- **WHEN** autocomplete is active and the user presses a key sequence configured under `piVimMode.keymap.insert`
- **THEN** input delegates to Pi autocomplete behavior rather than executing the insert action

#### Scenario: Prompt transform keybindings remain separate

- **WHEN** `piVimMode.keymap.insert` configures safe insert actions and `piVimMode.keymap.actions` configures prompt transform actions
- **THEN** insert actions perform only physical prompt edits or cursor movement, and prompt transforms continue to dispatch only through `piVimMode.keymap.actions` in supported modal contexts

## MODIFIED Requirements

### Requirement: Insert newline configuration is documented and validated

The change SHALL include automated validation and user-facing documentation for insert-mode line-opening, edit, and navigation keybindings.

#### Scenario: Automated validation covers insert keymap config

- **WHEN** `bun test` is executed
- **THEN** tests cover default empty insert bindings, accepted modified keys for line-opening/edit/navigation actions, raw printable rejection, protected-key allow-list behavior, duplicate insert binding diagnostics, invalid config fallback, live editor option cloning, insert-mode dispatch, autocomplete delegation, and preserved Pi delegation for unconfigured input

#### Scenario: Settings reference documents insert bindings

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.insert.openLineBelow`, `openLineAbove`, `deleteWordBackward`, `deleteWordForward`, `deleteLineBackward`, `deleteLineForward`, `moveWordBackward`, `moveWordForward`, `moveLineStart`, and `moveLineEnd`, including empty defaults, valid key forms, protected-key allow-list requirements, duplicate binding behavior, and non-goals for full insert-mode mappings

#### Scenario: Feature guide documents insert behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents that insert mode delegates to Pi by default and only configured insert line-opening, edit, or movement bindings are handled by pi-vimmode while autocomplete is inactive
