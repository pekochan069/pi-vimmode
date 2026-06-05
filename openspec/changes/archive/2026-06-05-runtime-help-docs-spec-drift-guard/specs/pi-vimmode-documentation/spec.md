## ADDED Requirements

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
