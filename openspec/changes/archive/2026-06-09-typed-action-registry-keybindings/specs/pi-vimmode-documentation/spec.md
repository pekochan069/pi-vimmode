## ADDED Requirements

### Requirement: Documentation explains action keybindings and non-goals

User-facing docs SHALL describe named prompt transform action keybindings, examples, validation commands, and explicit non-goals without implying full Vim/Neovim parity. Detailed behavior SHALL live in `docs/features.md` and `docs/settings.md`; README SHALL remain a quickstart and docs index.

#### Scenario: Settings docs describe keymap actions config

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.actions`, supported `prompt.transform.*` action IDs, string entries, `{ key, args }` entries, invalid config warnings, and protected shortcut behavior

#### Scenario: Feature docs include prompt transform action examples

- **WHEN** the user opens `docs/features.md`
- **THEN** it includes examples for binding reflow, fence, quote, or unquote prompt transform actions

#### Scenario: README remains an index

- **WHEN** the user opens `README.md`
- **THEN** it links to detailed feature/settings documentation without duplicating the full action keybinding reference

#### Scenario: Docs explain existing prompt transform settings remain separate

- **WHEN** docs describe action keybindings
- **THEN** they state that `piVimMode.promptTransforms.actions` remains the existing transform enable-flag surface, `piVimMode.promptTransforms.commands` remains the Ex command-name configuration surface, and neither moves into `keymap.actions`

#### Scenario: Docs explain legacy alias transition

- **WHEN** docs describe runtime diagnostics and action keybinding config for prompt transform actions
- **THEN** they explain that canonical `prompt.transform.*` IDs are required in config and legacy `promptTransform.*` aliases are temporary diagnostic/search aliases only

#### Scenario: Docs list first milestone non-goals

- **WHEN** docs describe the action registry milestone
- **THEN** they explicitly exclude full Vimscript, recursive mappings, plugin API, `:map`, `:action`, quickref parity, and rectangular visualBlock transforms

#### Scenario: Release docs include package artifact verification

- **WHEN** release or validation docs describe publishing the package
- **THEN** they include `bun run build` and package contents inspection in addition to tests, typecheck, lint, and format checks
