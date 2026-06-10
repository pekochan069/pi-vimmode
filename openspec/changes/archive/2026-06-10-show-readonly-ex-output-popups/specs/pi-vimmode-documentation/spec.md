## ADDED Requirements

### Requirement: Feature guide documents read-only Ex popup output

The project SHALL document the generic read-only Ex help/diagnostic popup in user-facing feature docs.

#### Scenario: Docs list popup-backed commands

- **WHEN** a user opens `docs/features.md`
- **THEN** the feature guide lists popup-backed read-only Ex commands including `:help`, `:help <topic>`, `:features`, `:features <query>`, `:actions <query>`, `:keymap <action>`, `:mapcheck <key>`, `:messages`, `:vimmode inspect`, and `:vimdoctor`

#### Scenario: Docs explain popup controls

- **WHEN** a user reads the read-only Ex popup documentation
- **THEN** it explains popup dismissal with `Esc`, `Ctrl-C`, or `Ctrl-G` and popup-local scrolling with `j`/`k` or arrow keys

#### Scenario: Docs explain compact feedback boundary

- **WHEN** a user reads the Ex command-line or runtime help documentation
- **THEN** it explains that mutating Ex commands, parser errors, edit-flow success/errors, prompt transforms, `:noh`, and optional no-op feedback keep compact inline/workbench behavior rather than opening the read-only popup

#### Scenario: Docs explain popup history behavior

- **WHEN** a user reads the runtime message or inspectability documentation
- **THEN** it explains that popup content and popup scroll/dismiss actions do not create retained runtime message history entries, and that `:messages` output itself is not retained as message history

## MODIFIED Requirements

### Requirement: Feature guide documents keybinding discovery popup

The project SHALL document the finite read-only Ex popup, including keybinding discovery popup content, in user-facing feature docs.

#### Scenario: Docs explain popup entry point

- **WHEN** a user opens `docs/features.md`
- **THEN** the feature guide documents that read-only Ex help and diagnostic commands open a dedicated bounded read-only overlay popup, including `:features keybindings` as the keybinding discovery entry point

#### Scenario: Docs explain popup contents

- **WHEN** a user reads the read-only popup documentation
- **THEN** it explains that popup content can include runtime help topics, feature discovery results, action keybinding recipes or presets, canonical `prompt.transform.*` action IDs, accepted configured action bindings, customization diagnostics, message history summaries, and inspectability summaries

#### Scenario: Docs explain popup scrolling

- **WHEN** a user reads the read-only popup documentation
- **THEN** it explains that overflowing popup content can be scrolled inside the popup with popup-local controls such as `j`/`k` or arrow keys

#### Scenario: Docs explain popup dismissal

- **WHEN** a user reads the read-only popup documentation
- **THEN** it explains the supported dismissal behavior such as `Esc`, `Ctrl-C`, `Ctrl-G`, or existing reset/cancel behavior when applicable

#### Scenario: Docs explain popup non-goals

- **WHEN** a user reads the read-only popup documentation
- **THEN** it states that the popup does not provide full Vim help tags, a command palette, runtime `:map`, runtime `:action`, recursive mappings, plugin API, diagnostic/help action keybinding dispatch, default action keybindings, persistent logs, or an unbounded output log

### Requirement: Documentation keeps one-line and popup discovery distinct

User-facing docs SHALL distinguish popup-backed read-only Ex help/diagnostic output from existing compact runtime feedback and edit-flow messages.

#### Scenario: Docs preserve compact edit feedback expectations

- **WHEN** docs describe `:actions`, `:keymap`, `:mapcheck`, `:help`, `:features`, `:messages`, `:vimmode inspect`, and `:vimdoctor`
- **THEN** they identify those valid read-only help/diagnostic outputs as popup-backed while preserving compact inline/workbench expectations for mutating Ex commands, parser errors, edit-flow success/errors, prompt transforms, `:noh`, search input, substitution preview/apply feedback, and optional no-op feedback

#### Scenario: Docs keep settings reference separate

- **WHEN** docs describe read-only popup contents
- **THEN** detailed setting shapes, defaults, and validation rules remain in `docs/settings.md`, while `docs/features.md` summarizes only the behavior needed to discover and understand read-only popup output
