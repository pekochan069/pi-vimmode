## MODIFIED Requirements

### Requirement: Drift guard validates prompt transform action registry claims

The project SHALL validate that prompt transform action registry metadata, runtime diagnostics, specs, tests, and user-facing docs stay aligned.

#### Scenario: Public action ID missing from docs fails validation

- **WHEN** a bindable prompt transform action ID exists in the registry and user docs do not mention it or its docs anchor
- **THEN** the docs drift guard fails in the normal validation path

#### Scenario: Documented action ID missing from registry fails validation

- **WHEN** user docs mention a `prompt.transform.*` action ID that is absent from the registry
- **THEN** the docs drift guard fails with an actionable message

#### Scenario: Registry docs anchor missing fails validation

- **WHEN** a registry action entry references a docs anchor that does not exist in docs
- **THEN** the docs drift guard fails before the change is considered complete

#### Scenario: Example keymap actions config parses successfully

- **WHEN** docs include an example `piVimMode.keymap.actions` configuration
- **THEN** an automated test parses the example or an equivalent fixture successfully

#### Scenario: Stale legacy alias claims fail validation

- **WHEN** user-facing docs, runtime help metadata, source-backed popup content, or tests claim that `promptTransform.*` aliases are supported or searchable
- **THEN** docs/source drift validation fails before the change is considered complete
