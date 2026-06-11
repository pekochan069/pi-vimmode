## ADDED Requirements

### Requirement: Documentation explains action keybinding presets

User-facing pi-vimmode documentation SHALL describe named action keybinding presets as finite opt-in config bundles for `piVimMode.keymap.actionPresets`, including accepted preset IDs, examples, override behavior, and non-goals.

#### Scenario: Settings docs list accepted preset IDs

- **WHEN** a user reads `docs/settings.md` for action keybindings
- **THEN** the docs list accepted `piVimMode.keymap.actionPresets` IDs such as `paragraph-editing` and `markdown-wrapping`

#### Scenario: Settings docs show copy-pasteable preset config

- **WHEN** a user reads action keybinding preset docs
- **THEN** the docs include a complete JSON example using `piVimMode.keymap.actionPresets`

#### Scenario: Docs explain preset override and clearing behavior

- **WHEN** docs describe action keybinding preset resolution
- **THEN** they explain that explicit `piVimMode.keymap.actions` entries override preset-provided entries for the same action ID and that explicit empty action arrays can clear preset-provided bindings

#### Scenario: Docs distinguish presets from recipes

- **WHEN** docs describe both action keybinding recipes and action keybinding presets
- **THEN** they explain that recipes are copy-paste snippets, presets are selectable config bundles, and both are backed by the same finite canonical action metadata

#### Scenario: Docs state preset non-goals

- **WHEN** docs describe action keybinding presets
- **THEN** they state that presets create no default keybindings and do not provide recursive mappings, runtime `:map`, `.vimrc`, plugin API, diagnostic/help action dispatch, or full Vim/Neovim parity

#### Scenario: Feature docs mention runtime discovery

- **WHEN** a user reads `docs/features.md` action keybinding guidance
- **THEN** it explains how to discover presets with finite runtime help queries such as `:features keybindings` or `:features action presets`
