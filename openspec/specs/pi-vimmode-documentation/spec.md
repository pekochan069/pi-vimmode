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

