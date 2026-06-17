## ADDED Requirements

### Requirement: Built-in keymap metadata remains single-source consistent

The Vim keymap configuration SHALL keep built-in semantic action names, default key sequences, validation allow-lists, command resolver mappings, and diagnostics-facing labels consistent from one typed built-in metadata source while preserving existing `piVimMode.keymap` behavior.

#### Scenario: Default keymap remains equivalent

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap exposes the same default operator, motion, command, macro, mark, text-object, operator-motion, and action bindings as before this change

#### Scenario: Config validation uses the same semantic actions

- **WHEN** `piVimMode.keymap` configures any supported semantic operator, motion, command, macro, mark, text-object, or operator-motion action
- **THEN** settings resolution accepts that action according to the existing field-specific validation rules and preserves valid sibling fields

#### Scenario: Unsupported action still falls back safely

- **WHEN** `piVimMode.keymap` contains an unsupported action name, unsupported key shape, protected shortcut, duplicate binding, or conflicting binding
- **THEN** settings resolution ignores or rejects only the invalid field, records a warning, preserves valid sibling fields, and keeps session startup working

#### Scenario: Command resolver maps match default semantic bindings

- **WHEN** the editor resolves default normal-mode operators, motions, line commands, character-search commands, search commands, macro prefixes, mark prefixes, and text-object prefixes
- **THEN** command parsing returns the same finite semantic results as before this change, including pending-prefix and invalid-key behavior

#### Scenario: Descriptor-derived tables do not add user-visible behavior

- **WHEN** users keep existing global or project settings
- **THEN** no new keybindings, recursive mappings, timeout behavior, Vimscript behavior, or Neovim-specific behavior becomes available as a side effect of the table refactor

### Requirement: Descriptor-derived keymap tables are validated by equivalence tests

The change SHALL include automated tests that prove descriptor-derived keymap data remains equivalent to the existing public keymap contract.

#### Scenario: Automated equivalence validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover descriptor/default keymap equivalence, supported-action validation, unsupported-action fallback, legacy operator and motion map equivalence, command classification equivalence, protected shortcut handling, and conflict diagnostics

#### Scenario: Typecheck validates descriptor coverage

- **WHEN** `bun run check-types` is executed
- **THEN** TypeScript verifies descriptor records cover the public semantic action unions without unsupported action keys
