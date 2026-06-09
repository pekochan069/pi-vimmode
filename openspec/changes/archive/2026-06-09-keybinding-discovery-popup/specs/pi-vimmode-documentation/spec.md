## ADDED Requirements

### Requirement: Feature guide documents keybinding discovery popup

The project SHALL document the finite keybinding discovery popup in user-facing feature docs.

#### Scenario: Docs explain popup entry point

- **WHEN** a user opens `docs/features.md`
- **THEN** the feature guide documents that `:features keybindings` opens a dedicated bounded read-only keybinding discovery overlay popup

#### Scenario: Docs explain popup contents

- **WHEN** a user reads the keybinding discovery popup documentation
- **THEN** it explains that popup content can include action keybinding recipes or presets, canonical `prompt.transform.*` action IDs, accepted configured action bindings, and hints for `:actions`, `:keymap`, and `:mapcheck`

#### Scenario: Docs explain popup scrolling

- **WHEN** a user reads the keybinding discovery popup documentation
- **THEN** it explains that overflowing popup content can be scrolled inside the popup with popup-local controls such as `j`/`k` or arrow keys

#### Scenario: Docs explain popup dismissal

- **WHEN** a user reads the keybinding discovery popup documentation
- **THEN** it explains the supported dismissal behavior such as `Esc` or existing reset/cancel behavior

#### Scenario: Docs explain popup non-goals

- **WHEN** a user reads the keybinding discovery popup documentation
- **THEN** it states that the popup does not provide full Vim help tags, a command palette, runtime `:map`, runtime `:action`, recursive mappings, plugin API, diagnostic/help action keybinding dispatch, default action keybindings, or an unbounded output log

### Requirement: Documentation keeps one-line and popup discovery distinct

User-facing docs SHALL distinguish popup-enabled keybinding discovery from existing compact runtime-help and diagnostic outputs.

#### Scenario: Docs preserve compact command expectations

- **WHEN** docs describe `:actions`, `:keymap`, `:mapcheck`, `:help`, `:features`, and `:messages`
- **THEN** they identify `:features keybindings` as the initial popup entry point and do not imply every runtime help command opens a popup

#### Scenario: Docs keep settings reference separate

- **WHEN** docs describe keybinding discovery popup contents
- **THEN** detailed setting shapes, defaults, and validation rules remain in `docs/settings.md`, while `docs/features.md` summarizes only the behavior needed to discover and understand bindings
