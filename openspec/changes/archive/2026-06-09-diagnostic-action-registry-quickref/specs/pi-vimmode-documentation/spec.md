## ADDED Requirements

### Requirement: Feature guide quickref classifies diagnostic and help surfaces

The project SHALL document a concise pi-vimmode quick reference that classifies supported commands and actions by actual pi-vimmode behavior rather than Vim/Neovim parity.

#### Scenario: Quickref separates supported surface categories

- **WHEN** a user opens `docs/features.md`
- **THEN** the quick reference groups modal motions/edits, Ex line commands, prompt transforms, customization diagnostics, runtime help/inspectability, and keybindable prompt transform actions as distinct categories

#### Scenario: Quickref identifies metadata-only diagnostic actions

- **WHEN** a user reads quickref entries for `:vimdoctor`, `:actions`, `:keymap`, `:mapcheck`, `:help`, `:features`, `:messages`, or `:vimmode inspect`
- **THEN** the document identifies them as finite read-only diagnostic/runtime-help commands and does not present their `vimmode.*` metadata IDs as configurable keybinding targets

#### Scenario: Quickref documents unsupported parity boundaries

- **WHEN** a user reads the quick reference or runtime-help documentation
- **THEN** it states that pi-vimmode does not provide a public plugin action API, diagnostic action keybinding dispatch, runtime `:map`, runtime `:action`, Vimscript, Neovim Lua, full Vim help tags, or broad quickref parity

### Requirement: Documentation preserves prompt transform alias transition

User-facing docs SHALL continue to distinguish canonical prompt transform action IDs from temporary legacy diagnostic aliases.

#### Scenario: Canonical config IDs remain documented

- **WHEN** a user reads action keybinding documentation in `docs/features.md` or `docs/settings.md`
- **THEN** the docs require canonical `prompt.transform.*` IDs for `piVimMode.keymap.actions` config examples and supported ID lists

#### Scenario: Legacy aliases remain documented as diagnostics-only

- **WHEN** a user reads runtime diagnostics or action keybinding documentation during the alias transition release
- **THEN** the docs state that legacy `promptTransform.*` names remain searchable in diagnostics but are rejected in config with a warning that names the canonical `prompt.transform.*` ID

#### Scenario: Diagnostic metadata docs do not duplicate full settings reference

- **WHEN** docs explain diagnostic/help action metadata and quickref classification
- **THEN** detailed setting defaults and accepted shapes remain in `docs/settings.md`, while `docs/features.md` links or summarizes only the behavior needed for feature discovery
