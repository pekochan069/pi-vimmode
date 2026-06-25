## ADDED Requirements

### Requirement: Runtime help registry owns drift anchors

Runtime help drift validation SHALL read docs, spec, and test anchors for runtime help entries from the runtime help registry instead of a separate test-support metadata table.

#### Scenario: Registry entry supplies drift anchors

- **WHEN** a source-backed runtime help entry is included in drift validation
- **THEN** its required docs anchor, spec anchor, and test anchor are available from the runtime help registry entry or an explicit registry-owned exception

#### Scenario: Docs drift validation reads one runtime help source

- **WHEN** docs drift tests validate runtime help command coverage
- **THEN** they read runtime help entry IDs and drift anchors from the runtime help registry rather than joining registry IDs to a separate runtime docs metadata table

#### Scenario: Missing registry-owned docs anchor fails validation

- **WHEN** a runtime help registry entry names a required `docs/features.md` anchor that is absent
- **THEN** docs drift validation fails with an actionable message naming the entry and missing anchor

#### Scenario: Missing registry-owned spec or test anchor fails validation

- **WHEN** a runtime help registry entry lacks a required OpenSpec spec anchor or test anchor without an explicit registry-owned exception
- **THEN** docs drift validation fails before the change is considered complete

#### Scenario: Runtime help output remains unchanged

- **WHEN** `:help`, `:features`, `:messages`, or keybinding discovery output is exercised after anchor co-location
- **THEN** user-facing runtime help behavior remains finite, source-backed, and unchanged except for validation source ownership
