## ADDED Requirements

### Requirement: Insert newline bindings are configurable

The Vim keymap configuration SHALL accept opt-in insert-mode newline bindings for opening a prompt line below or above the current line without enabling a broad insert-mode mapping surface.

#### Scenario: Default insert newline keymap is empty

- **WHEN** Pi starts with no `piVimMode.keymap.insert` setting
- **THEN** the resolved keymap has no insert-mode newline bindings and existing insert-mode Pi delegation is preserved

#### Scenario: Insert line below binding is accepted

- **WHEN** `piVimMode.keymap.insert.openLineBelow` contains a valid modified key such as `ctrl+j`
- **THEN** the resolved keymap records `ctrl+j` as an insert-mode open-line-below binding without changing normal-mode `openLineBelow` bindings

#### Scenario: Insert line above binding is accepted

- **WHEN** `piVimMode.keymap.insert.openLineAbove` contains a valid modified key such as `ctrl+k`
- **THEN** the resolved keymap records `ctrl+k` as an insert-mode open-line-above binding without changing normal-mode `openLineAbove` bindings

#### Scenario: Raw printable insert binding is rejected

- **WHEN** `piVimMode.keymap.insert.openLineBelow` contains raw printable text such as `j`, `oo`, or `open`
- **THEN** that binding is ignored with a warning and valid sibling keymap fields remain usable

#### Scenario: Protected insert binding requires same-layer allow-list

- **WHEN** `piVimMode.keymap.insert.openLineBelow` contains a protected Pi shortcut such as `enter` and the same settings layer does not include it in `piVimMode.keymap.allowProtectedOverrides`
- **THEN** the binding is rejected with a protected-key warning and the shortcut continues to delegate to Pi behavior

#### Scenario: Allow-listed protected insert binding is accepted

- **WHEN** one settings layer configures `piVimMode.keymap.allowProtectedOverrides` with `enter` and `piVimMode.keymap.insert.openLineBelow` with `enter`
- **THEN** the resolved keymap accepts `enter` as an insert-mode open-line-below binding unless another validation rule rejects it

#### Scenario: Invalid insert binding fields preserve valid siblings

- **WHEN** `piVimMode.keymap.insert` contains unsupported field types, unknown insert actions, or invalid key entries alongside valid insert newline bindings
- **THEN** invalid entries produce warnings, valid insert newline bindings remain usable, and valid normal/visual keymap fields remain usable

### Requirement: Insert newline configuration is documented and validated

The change SHALL include automated validation and user-facing documentation for insert-mode newline keybindings.

#### Scenario: Automated validation covers insert newline config

- **WHEN** `bun test` is executed
- **THEN** tests cover default empty insert bindings, accepted modified keys, raw printable rejection, protected-key allow-list behavior, invalid config fallback, live editor option cloning, and insert-mode dispatch

#### Scenario: Settings reference documents insert newline bindings

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.insert.openLineBelow`, `piVimMode.keymap.insert.openLineAbove`, empty defaults, valid key forms, protected-key allow-list requirements, and non-goals for full insert-mode mappings

#### Scenario: Feature guide documents insert newline behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents that insert mode delegates to Pi by default and only configured insert newline bindings are handled by pi-vimmode while autocomplete is inactive
