## MODIFIED Requirements

### Requirement: Documentation records source-of-truth policy

The project SHALL keep an ADR under `docs/adr/` documenting that `docs/features.md` owns detailed behavior, `docs/settings.md` owns complete JSON settings reference, a canonical trusted JavaScript config guide owns executable-config setup/API/safety workflows, and README remains quickstart plus documentation index.

#### Scenario: Maintainer updates docs later

- **WHEN** a maintainer reads documentation source-of-truth ADR
- **THEN** ADR identifies feature guide, JSON settings reference, trusted JavaScript config guide, and README responsibilities
- **AND** instructs maintainers to verify claims against source files, canonical metadata, public declarations, OpenSpec specs, and focused tests

#### Scenario: JSON settings remain canonical in settings guide

- **WHEN** trusted JavaScript guide references corresponding JSON setting
- **THEN** it links or crosswalks to `docs/settings.md`
- **AND** does not become duplicate authority for JSON behavior

## ADDED Requirements

### Requirement: Canonical trusted JavaScript config guide covers complete contract

The project SHALL provide canonical trusted JavaScript config guide ordered as basic setup, generated properties, advanced setup, and safety semantics.

#### Scenario: User follows minimal setup

- **WHEN** user opens beginning of guide
- **THEN** guide shows exact global config location, primary JSDoc annotation, minimal default export, one validated assignment, and `/vimmode reload`
- **AND** prominently warns that config is unsandboxed trusted code with full Pi process privileges

#### Scenario: User learns advanced keymap API

- **WHEN** user opens advanced setup
- **THEN** guide documents supported mapping modes/scopes, action factories, arguments, compatibility aliases, conflicts, replay, unmapping, protected override, insert limits, and leader behavior

#### Scenario: User learns export and import behavior

- **WHEN** user configures synchronous, asynchronous, or imported helper workflow
- **THEN** guide documents supported default exports, helper typing, root-only reload, and native imported-helper caching requiring Pi restart after helper edits

#### Scenario: User learns safety and precedence semantics

- **WHEN** user opens safety section
- **THEN** guide documents trust boundary, global-only executable scope, layer precedence, source ordering, field-local warnings, fatal transactions, startup fallback, last-known-good reload, generation ordering, preserved/cleared editor state, compatibility, deprecation policy, and non-goals

### Requirement: Config property and action references are generated from canonical metadata

Committed guide SHALL contain generated property and action reference blocks derived from canonical finite metadata.

#### Scenario: Property reference is complete

- **WHEN** references are generated
- **THEN** every public config leaf appears exactly once with stable anchor, accepted type/value shape, explicit built-in default, assignment/replacement semantics, and JSON crosswalk where available

#### Scenario: Action reference is complete

- **WHEN** references are generated
- **THEN** every public finite action appears exactly once with stable anchor, supported scopes, arguments, and compatibility aliases

#### Scenario: Generated blocks are readable in repository

- **WHEN** user reads guide on GitHub without running build
- **THEN** committed generated blocks contain complete current references

#### Scenario: Reference drift fails validation

- **WHEN** canonical metadata changes without regenerating committed reference or metadata contains missing/duplicate public entries
- **THEN** validation fails with actionable drift error

#### Scenario: Regeneration is deterministic

- **WHEN** committed references match canonical metadata and generator runs
- **THEN** working tree remains clean

### Requirement: Trusted-config workflows are executable documentation

The project SHALL ship checked basic, keymap, asynchronous, and imported-preset examples plus preset helper and SHALL validate examples through real loader and public declarations without rewriting them for tests.

#### Scenario: Positive examples runtime-load

- **WHEN** example suite loads each shipped config through real loader
- **THEN** every example succeeds without warnings
- **AND** demonstrates documented effective behavior

#### Scenario: Positive examples typecheck unchanged

- **WHEN** example suite typechecks shipped examples
- **THEN** same files typecheck without test-only edits or wrappers

#### Scenario: Negative fixtures reject invalid shapes

- **WHEN** test fixtures use invalid leaves, values, modes, action arguments, or mapping options
- **THEN** public type checks fail at expected expressions
- **AND** negative fixtures are not shipped as user examples

#### Scenario: Imported preset behavior is explicit

- **WHEN** user follows imported-preset example
- **THEN** helper is typed with public `VimConfigApi`
- **AND** docs explain restart requirement after imported helper edits

### Requirement: Trusted-config documentation is discoverable and packaged

README, JSON settings guide, and runtime help SHALL link to canonical trusted JavaScript guide, and built package SHALL contain guide, checked examples/helper, declarations, and config type export.

#### Scenario: Discovery links resolve

- **WHEN** user follows trusted-config links from README, `docs/settings.md`, or runtime help
- **THEN** links reach canonical guide or stable generated anchor

#### Scenario: Built package contains promised documentation

- **WHEN** package inventory is inspected after build
- **THEN** guide, checked examples, preset helper, declarations, and config type export are present

#### Scenario: Temporary consumers prove config type export

- **WHEN** temporary Bundler and NodeNext consumers install or resolve built package
- **THEN** both resolve declaration-only config subpath and typecheck documented basic config

#### Scenario: Package drift fails validation

- **WHEN** source docs/examples/types promise artifact omitted from built package
- **THEN** package verification fails before release
