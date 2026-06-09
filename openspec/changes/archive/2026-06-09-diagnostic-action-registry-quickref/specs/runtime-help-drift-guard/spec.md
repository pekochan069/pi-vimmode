## ADDED Requirements

### Requirement: Runtime help classifies diagnostic action metadata

The Vim editor SHALL use source-backed diagnostic/help action metadata when runtime help and feature discovery describe supported diagnostic surfaces.

#### Scenario: Features query finds diagnostic metadata

- **WHEN** the editor executes `:features vimmode.doctor`, `:features vimdoctor`, or another supported diagnostic/help action query
- **THEN** it reports the matching finite command, diagnostic/runtime-help category, metadata-only status, and at least one relevant limitation such as no plugin API or no keybinding dispatch

#### Scenario: General features separates diagnostics and runtime help

- **WHEN** the editor executes `:features` without a query
- **THEN** the summary names diagnostics and runtime help as distinct finite feature categories rather than merging them into prompt transforms, keymap actions, or a general command palette

#### Scenario: Help topic explains diagnostic action limits

- **WHEN** the editor executes `:help actions`, `:help diagnostics`, or another supported topic covering diagnostic/help metadata
- **THEN** the help message identifies the finite supported commands and states that diagnostic/help action IDs are metadata-only and not user-plugin or keybinding dispatch targets

### Requirement: Drift guard validates diagnostic action metadata

The project SHALL validate diagnostic/help action metadata against docs, specs, tests, and finite parser support before the change is considered complete.

#### Scenario: Metadata docs anchor missing fails validation

- **WHEN** a diagnostic/help metadata entry requires a `docs/features.md` anchor and that anchor is missing
- **THEN** the docs drift guard fails with an actionable message identifying the metadata entry and missing anchor

#### Scenario: Metadata spec or test anchor missing fails validation

- **WHEN** a diagnostic/help metadata entry references a missing durable spec file or missing test anchor
- **THEN** the docs drift guard fails before the registry can be considered aligned

#### Scenario: Command-backed metadata must match finite Ex support

- **WHEN** a diagnostic/help metadata entry names an Ex command such as `vimdoctor`, `actions`, `features`, `messages`, or `vimmode inspect`
- **THEN** automated validation verifies that the command is supported by the finite parser or the entry declares an explicit non-command exception

#### Scenario: Metadata-only invariant is validated

- **WHEN** a diagnostic/help metadata entry is included in runtime discovery
- **THEN** automated validation verifies that the entry is not part of the bindable prompt transform action ID set accepted by `piVimMode.keymap.actions`
