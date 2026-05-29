## ADDED Requirements

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

### Requirement: Documentation work stays docs-only
The change SHALL avoid modifying runtime code, tests, package metadata, agent settings, Pi settings, or other config files.

#### Scenario: Change is implemented
- **WHEN** implementation completes
- **THEN** the diff contains only new or changed files under `docs/` and the OpenSpec change directory
