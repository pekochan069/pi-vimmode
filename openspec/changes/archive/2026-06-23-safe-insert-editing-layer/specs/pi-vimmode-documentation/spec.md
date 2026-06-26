## ADDED Requirements

### Requirement: Documentation explains safe insert editing layer

User-facing pi-vimmode documentation SHALL explain the opt-in safe insert editing layer, including supported actions, examples, validation behavior, and explicit non-goals.

#### Scenario: Settings reference lists insert action options

- **WHEN** the user opens `docs/settings.md`
- **THEN** the settings reference lists each `piVimMode.keymap.insert` action, its empty default, accepted key shape, protected-key allow-list behavior, duplicate binding diagnostics, autocomplete delegation, and raw printable rejection

#### Scenario: Feature guide shows readline-style examples

- **WHEN** the user opens `docs/features.md`
- **THEN** the feature guide includes a copy-pasteable readline-style example for insert-mode word/line deletion and movement using chords such as `ctrl+w`, `ctrl+u`, `ctrl+k`, `ctrl+a`, `ctrl+e`, `alt+b`, and `alt+f`

#### Scenario: Feature guide shows home-row-mod examples separately

- **WHEN** the user opens `docs/features.md`
- **THEN** the feature guide includes a separate home-row-mod example for insert-mode line opening and explains that `ctrl+k` cannot be assigned to both readline `deleteLineForward` and home-row `openLineAbove` in the same insert keymap

#### Scenario: Documentation names word semantics

- **WHEN** docs describe insert word movement or deletion
- **THEN** they state that insert word actions reuse pi-vimmode lowercase small-word semantics where keyword runs, punctuation runs, and whitespace are separate groups

#### Scenario: Documentation keeps action surfaces separate

- **WHEN** docs describe safe insert bindings
- **THEN** they state that `piVimMode.keymap.insert` owns physical insert edits and movement, while semantic prompt transforms remain under `piVimMode.keymap.actions`

#### Scenario: Documentation states insert mapping non-goals

- **WHEN** docs describe insert keybinding limitations
- **THEN** they exclude raw printable mappings such as `jk`, `jj`, and `oo`, multi-key insert sequences, insert abbreviations, recursive mappings, `.vimrc`, Vimscript, Neovim Lua, default insert presets, and full Vim/Neovim parity
