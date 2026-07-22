## ADDED Requirements

### Requirement: Config property and action references are generated from canonical metadata

The project SHALL commit generated property and action reference blocks in `docs/config.md`, derived from canonical finite source metadata without introducing a competing config or action registry.

#### Scenario: Property reference is complete

- **WHEN** trusted-config property references are generated
- **THEN** every public config property appears exactly once with an explicit stable anchor, accepted type or value shape, built-in default, assignment or replacement semantics, and corresponding JSON path where one exists

#### Scenario: Property alias remains one entry

- **WHEN** a public config property has a compatibility alias such as `vim.g.mapleader`
- **THEN** generated reference identifies alias on canonical property entry instead of creating duplicate property entry

#### Scenario: Action reference is complete

- **WHEN** trusted-config action references are generated
- **THEN** every public finite action appears exactly once with an explicit stable anchor, canonical factory path, supported mapping scopes, accepted arguments, and compatibility aliases
- **AND** non-bindable diagnostic metadata is not presented as public action factory

#### Scenario: Generated blocks are readable in repository

- **WHEN** user opens `docs/config.md` from repository without running build
- **THEN** committed generated blocks contain complete current property and action references
- **AND** `docs/settings.md` remains canonical source for detailed JSON configuration behavior

#### Scenario: Regeneration is deterministic

- **WHEN** canonical metadata and committed references match and generator runs
- **THEN** generated file content remains unchanged and working tree stays clean

#### Scenario: Metadata coverage failure is actionable

- **WHEN** canonical metadata has duplicate public entries, omits public declaration entry, lacks required reference fields, or maps multiple entries to same anchor
- **THEN** validation fails and identifies offending property, action, field, or anchor

#### Scenario: Committed output drift fails validation

- **WHEN** canonical metadata changes without regenerating committed reference blocks
- **THEN** validation fails with command or guidance needed to regenerate references

#### Scenario: Generated anchors resolve

- **WHEN** validation checks links and explicit anchors in generated reference blocks
- **THEN** every generated local reference resolves and duplicate or missing anchor fails validation

#### Scenario: Declaration-only contract remains compatible

- **WHEN** generated metadata coverage is checked against public `VimConfig` and `VimConfigApi` declarations
- **THEN** property paths, accepted shapes, action factories, arguments, scopes, and compatibility aliases agree with declaration-only contract
- **AND** no runtime config helper, descriptor constructor, registry export, or config behavior change is introduced
