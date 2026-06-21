## ADDED Requirements

### Requirement: Escape aliases are configurable

The Vim keymap configuration SHALL accept an opt-in `piVimMode.keymap.escape` array of finite key sequences that act as aliases for insert-mode and visual-mode escape behavior without changing normal-mode, operator-pending, or Pi-owned shortcut bindings.

#### Scenario: Default insert escape aliases are absent

- **WHEN** Pi starts with no `piVimMode.keymap.escape` setting
- **THEN** the resolved keymap has no custom escape aliases and ordinary insert-mode text delegation remains unchanged

#### Scenario: Modified-key escape alias is accepted

- **WHEN** `piVimMode.keymap.escape` contains a valid modified-key alias such as `<C-j>` or `<D-j>`
- **THEN** the resolved keymap records that sequence as an escape alias without removing normal-mode `j`, normal-mode `k`, or any other existing normal/visual key binding

#### Scenario: Protected shortcut alias is rejected

- **WHEN** `piVimMode.keymap.escape` contains a protected Pi shortcut such as `enter`, `tab`, `ctrl+c`, or `escape`
- **THEN** that alias is ignored, a warning is recorded, and the protected shortcut keeps its existing Pi or pi-vimmode behavior

#### Scenario: Raw printable text aliases are rejected

- **WHEN** `piVimMode.keymap.escape` contains printable text such as `j`, `jk`, or `jj`
- **THEN** that alias is ignored with a warning so users can still type that text normally in insert mode

#### Scenario: Invalid alias fields fall back safely

- **WHEN** `piVimMode.keymap.escape` is not an array or contains unsupported key values
- **THEN** invalid entries are ignored with warnings and valid sibling keymap settings remain usable

#### Scenario: Escape aliases are finite and non-recursive

- **WHEN** users configure escape aliases
- **THEN** aliases are resolved as finite key sequences only and do not enable recursive mappings, Vimscript, `.vimrc`, insert abbreviations, or timeout-based mapping behavior

### Requirement: Escape aliases are documented and discoverable

The change SHALL document configured escape aliases and keep runtime keymap diagnostics aligned with the effective configuration.

#### Scenario: Settings reference documents escape aliases

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.escape`, examples such as `<C-j>` and `<D-j>`, protected-key rejection, raw printable text rejection, autocomplete behavior, and Ctrl-J terminal ambiguity

#### Scenario: Feature guide documents escape behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** the escape and reset behavior section describes configured escape aliases for leaving insert mode, visual modes, and pending Ex command-lines

#### Scenario: Runtime diagnostics describe escape aliases

- **WHEN** runtime keymap diagnostics such as `:keymap`, `:mapcheck`, `:keybindings`, or `:features` report configured escape aliases
- **THEN** they identify the aliases as insert/visual/Ex escape bindings and do not imply full Vim mapping support

#### Scenario: Automated validation covers insert escape configuration

- **WHEN** `bun test` is executed
- **THEN** tests cover accepted modified-key aliases, rejected protected shortcuts, rejected raw printable text aliases, invalid config fallback, normal-mode keymap preservation, and live editor option cloning for the new setting
