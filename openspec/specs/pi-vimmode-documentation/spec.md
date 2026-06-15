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

#### Scenario: Docs require canonical action IDs only

- **WHEN** docs describe runtime diagnostics and action keybinding config for prompt transform actions
- **THEN** they state that canonical `prompt.transform.*` IDs are required and do not describe legacy `promptTransform.*` aliases as supported or searchable

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

### Requirement: Documentation explains WORD and previous-end motions

User-facing pi-vimmode documentation SHALL describe supported WORD and previous-end word motions, including examples, configurable action names, operator composition, and explicit non-goals.

#### Scenario: Feature guide documents motion behavior

- **WHEN** a user opens `docs/features.md`
- **THEN** the normal motions section documents `W`, `B`, `E`, `ge`, and `gE`, explains that WORD motions are whitespace-delimited, and gives at least one prompt-editing example involving paths, flags, URLs, or code-like tokens

#### Scenario: Feature guide documents operator composition

- **WHEN** a user opens `docs/features.md`
- **THEN** the operator-motion documentation includes examples or descriptions for delete, change, or yank with WORD and previous-end motions such as `dW`, `cE`, `dge`, or `ygE`

#### Scenario: Settings reference documents semantic action names

- **WHEN** a user opens `docs/settings.md`
- **THEN** the keymap motion reference lists `wordForwardBig`, `wordBackwardBig`, `wordEndBig`, `wordPreviousEnd`, and `wordPreviousEndBig` with their default bindings and notes that these actions can be used in `operatorMotions`

#### Scenario: Documentation states scope boundaries

- **WHEN** a user reads the motion limitations in `docs/features.md` or `docs/settings.md`
- **THEN** the docs state that this change does not add subword/camelCase navigation, display-line motions, recursive mappings, Vimscript, `.vimrc`, or full Vim/Neovim parity

#### Scenario: Documentation preserves lowercase word behavior claims

- **WHEN** docs describe `w`, `b`, `e`, `W`, `B`, `E`, `ge`, or `gE`
- **THEN** they do not claim that lowercase word motions were changed to a new punctuation-aware boundary model unless source behavior and tests actually implement that boundary model
