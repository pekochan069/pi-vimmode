## ADDED Requirements

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
