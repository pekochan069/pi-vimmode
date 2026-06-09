# pi-vimmode-documentation Specification

## Purpose

TBD - created by archiving change document-pi-vimmode-features-settings. Update Purpose after archive.
## Requirements
### Requirement: Feature guide covers pi-vimmode behavior

The project SHALL provide `docs/features.md` as a user-facing guide that explains every supported pi-vimmode feature area with concrete examples and explicit limitations.

#### Scenario: User reads feature guide

- **WHEN** a user opens `docs/features.md`
- **THEN** the document covers activation, modes, normal motions, normal edits, character search, prompt search, visual character mode, visual line mode, visual block mode, Ex substitution, registers, marks, macros, UI/status rendering, terminal cursor hints, Pi shortcut compatibility, limitations, and validation commands

#### Scenario: User follows feature examples

- **WHEN** a user reads a feature section in `docs/features.md`
- **THEN** the section includes at least one practical example or workflow for the documented feature area

### Requirement: Settings reference covers every piVimMode option

The project SHALL provide `docs/settings.md` as a complete reference for the `piVimMode` settings object.

#### Scenario: User checks a setting

- **WHEN** a user opens `docs/settings.md`
- **THEN** the document lists every supported `piVimMode` key, nested key, default value, accepted value shape, behavior, and relevant validation or fallback behavior

#### Scenario: User configures pi-vimmode

- **WHEN** a user reads `docs/settings.md`
- **THEN** the document explains global settings, project settings, merge precedence, warning behavior, protected key handling, Vim-style key notation, and practical JSON examples

### Requirement: Documentation records source-of-truth policy

The project SHALL add an ADR under `docs/adr/` documenting where user-facing pi-vimmode docs live and which implementation/spec files are authoritative for future updates.

#### Scenario: Maintainer updates docs later

- **WHEN** a maintainer reads the new ADR
- **THEN** the ADR identifies `docs/features.md` and `docs/settings.md` as the user-facing docs and instructs maintainers to verify behavior against source files, OpenSpec specs, and tests before changing those docs

### Requirement: Documentation work stays focused

The change SHALL keep the primary documentation deliverables under `docs/` and the OpenSpec change directory, while allowing small review-follow-up fixes to source, tests, and durable OpenSpec specs when review finds documented behavior would otherwise drift from implementation.

#### Scenario: Initial documentation implementation completes

- **WHEN** the initial documentation pass completes before review follow-up
- **THEN** the diff contains only new or changed files under `docs/` and the OpenSpec change directory

#### Scenario: Review finds behavior or durable-requirement drift

- **WHEN** documentation review identifies runtime behavior, test coverage, or durable OpenSpec specs that contradict the new canonical docs
- **THEN** the change may include minimal source, test, or durable-spec edits that directly resolve the drift and are validated with focused tests and OpenSpec validation

### Requirement: Feature guide covers customization diagnostics

The project SHALL document runtime customization diagnostics in `docs/features.md` as part of the supported pi-vimmode behavior guide.

#### Scenario: User reads diagnostic command documentation

- **WHEN** a user opens `docs/features.md`
- **THEN** the document explains `:vimdoctor`, `:keymap`, `:mapcheck`, and `:actions` with practical examples and explicit limitations

#### Scenario: User troubleshoots vim warning status

- **WHEN** a user opens `docs/features.md` after seeing `vim ⚠`
- **THEN** the document explains that `:vimdoctor` reports retained settings diagnostics and that invalid fields are ignored without discarding valid siblings

#### Scenario: User checks non-goals

- **WHEN** a user reads the customization diagnostics section
- **THEN** the document states that pi-vimmode does not support `.vimrc`, recursive mappings, Vimscript, Neovim Lua, or a full interactive Vim command palette

### Requirement: Settings reference covers presets and feedback

The project SHALL document every new `piVimMode` customization setting in `docs/settings.md`.

#### Scenario: User reads preset settings

- **WHEN** a user opens `docs/settings.md`
- **THEN** the document lists supported preset names, preset intent, merge precedence, fallback behavior for invalid presets, and examples of explicit fields overriding preset defaults

#### Scenario: User reads no-op feedback settings

- **WHEN** a user opens `docs/settings.md`
- **THEN** the document lists the no-op feedback setting, default quiet behavior, accepted values, and examples of feedback messages when enabled

#### Scenario: User reads protected shortcut settings

- **WHEN** a user opens `docs/settings.md`
- **THEN** the document includes protected Pi shortcut explanations and tells users to use `:mapcheck` for runtime key ownership details

### Requirement: Documentation stays aligned with customization source of truth

User-facing customization docs SHALL be validated against source behavior, OpenSpec requirements, and tests before the change is complete.

#### Scenario: Docs mention diagnostic commands

- **WHEN** docs mention `:vimdoctor`, `:keymap`, `:mapcheck`, or `:actions`
- **THEN** parser, modal, and rendering tests cover the documented command behavior

#### Scenario: Docs mention settings

- **WHEN** docs mention presets, feedback settings, protected shortcuts, or keymap merge precedence
- **THEN** config tests cover the documented accepted values, invalid fallback behavior, and field-by-field preservation

#### Scenario: Docs mention protected shortcuts

- **WHEN** docs list protected Pi shortcuts or pi-vimmode-owned shortcuts
- **THEN** the list matches the protected shortcut catalog used by runtime diagnostics and validation

### Requirement: Feature guide documents runtime help and feature discovery

The project SHALL document runtime help, feature discovery, and message introspection in `docs/features.md` with practical examples and explicit limitations.

#### Scenario: User reads runtime help documentation

- **WHEN** a user opens `docs/features.md`
- **THEN** the document explains `:help [topic]`, `:features [query]`, and `:messages` with practical examples and states that runtime help is finite, compact, and not a full Vim help system

#### Scenario: User reads feature discovery examples

- **WHEN** a user opens `docs/features.md`
- **THEN** the document includes examples for discovering supported commands or actions such as `:features nohlsearch`, `:features redo`, or equivalent supported feature queries

#### Scenario: User reads message introspection limitations

- **WHEN** a user opens `docs/features.md`
- **THEN** the document explains that runtime messages are prompt-local, in-memory, bounded, and shown through the existing transient message row rather than a pager

### Requirement: Documentation drift guard protects feature docs

The project SHALL validate user-facing feature docs against source-backed runtime help metadata, durable OpenSpec anchors, and test anchors before the change is complete.

#### Scenario: Feature docs miss runtime help anchor

- **WHEN** a runtime help registry entry requires a `docs/features.md` anchor and that anchor is missing
- **THEN** the documentation drift guard fails with an actionable validation error

#### Scenario: Feature docs contradict supported Ex command

- **WHEN** `docs/features.md` or another user-facing docs file claims that a source-supported command such as `:noh` or `:nohlsearch` is unsupported
- **THEN** the documentation drift guard fails and identifies the stale unsupported claim

#### Scenario: Feature docs list unsupported runtime command as supported

- **WHEN** `docs/features.md` documents an Ex runtime help command as supported but the finite Ex parser or source-backed registry does not include that command
- **THEN** the documentation drift guard fails before the docs can be considered aligned

### Requirement: Settings reference remains aligned with config source

The project SHALL keep `docs/settings.md` aligned with supported `piVimMode` settings, defaults, accepted value shapes, and validation behavior when runtime help or drift guard metadata references settings.

#### Scenario: Settings docs key is missing from source metadata

- **WHEN** `docs/settings.md` lists a `piVimMode` setting path that is neither supported by source config/types metadata nor listed as an approved ignored legacy setting
- **THEN** the documentation drift guard fails with the unexpected setting path

#### Scenario: Settings docs default contradicts source metadata

- **WHEN** a setting default documented in `docs/settings.md` contradicts the source-backed config metadata available to the drift guard
- **THEN** the documentation drift guard fails with the setting path and conflicting default

#### Scenario: Runtime help references setting docs

- **WHEN** a runtime help or feature registry entry references a setting-controlled feature area
- **THEN** the corresponding setting path is documented in `docs/settings.md` or the registry entry declares that no user setting controls the feature

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

