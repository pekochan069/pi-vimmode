## ADDED Requirements

### Requirement: User-facing docs document keybindings command

The user-facing feature guide SHALL document the dedicated keybindings popup command, query behavior, read-only state boundaries, and current limitations.

#### Scenario: Feature guide names keybindings command

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `:keybindings` as the direct read-only popup entry point for effective keybinding discovery

#### Scenario: Feature guide documents keybindings query behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `:keybindings <query>` examples for action lookup, key ownership lookup, protected shortcuts, or finite no-match behavior

#### Scenario: Feature guide documents popup controls and boundaries

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents that the keybindings popup is bounded, width-safe, locally scrollable, dismissible, and read-only with respect to prompt editing state

#### Scenario: Feature guide documents keybindings non-goals

- **WHEN** the user opens `docs/features.md`
- **THEN** it states that keybinding discovery does not provide runtime `:map`, recursive mappings, Vimscript, a command palette, plugin dispatch, diagnostic/help action keybinding dispatch, or default action keybindings

### Requirement: Settings docs document keybindings popup command binding

The settings reference SHALL document how users can configure an optional normal-mode keybinding for the dedicated keybindings popup command.

#### Scenario: Settings reference lists command path

- **WHEN** the user opens `docs/settings.md`
- **THEN** it lists `piVimMode.keymap.commands.showKeybindings`, its default empty binding list, and its effect of opening the keybindings popup

#### Scenario: Settings reference documents validation rules

- **WHEN** the user opens `docs/settings.md`
- **THEN** it explains that `showKeybindings` follows normal semantic keymap validation, including protected shortcut rejection, conflict rejection, finite multi-key matching, and insert-mode Pi delegation

#### Scenario: Settings reference keeps metadata boundary clear

- **WHEN** the user opens `docs/settings.md`
- **THEN** it clarifies that `vimmode.*` diagnostic/help metadata IDs are not accepted by `piVimMode.keymap.actions`, and users should configure `piVimMode.keymap.commands.showKeybindings` for a shortcut to the keybindings popup

### Requirement: README remains a quickstart and docs index

The README SHALL stay concise and point users to canonical feature/settings docs rather than duplicating the full keybindings command reference.

#### Scenario: README does not become full keybindings reference

- **WHEN** this change updates documentation
- **THEN** README remains a quickstart/index and any detailed `:keybindings` behavior or config examples live in `docs/features.md` and `docs/settings.md`
