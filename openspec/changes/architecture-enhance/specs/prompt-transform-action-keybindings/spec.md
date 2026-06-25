## ADDED Requirements

### Requirement: Customization diagnostics use prompt transform registry metadata

Customization diagnostics SHALL derive prompt transform action IDs, descriptions, argument summaries, and enabled/disabled state from the canonical prompt transform action registry rather than duplicating prompt transform facts in the diagnostics layer.

#### Scenario: Actions diagnostic reports registry-backed transform metadata

- **WHEN** the editor executes `:actions reflow` and `prompt.transform.reflow` is available
- **THEN** the diagnostic reports the canonical action ID and description from the prompt transform action registry

#### Scenario: Features diagnostic reports current transform command names

- **WHEN** the editor executes `:features quote` after resolved options rename the quote transform command
- **THEN** the feature result uses the registry-backed action metadata together with the current resolved command name

#### Scenario: Disabled transform remains discoverable as disabled

- **WHEN** the editor executes `:actions reflow` or `:features reflow` and resolved prompt transform options disable reflow
- **THEN** diagnostics report the canonical action ID as disabled for the current editor without exposing a stale duplicate description

#### Scenario: Registry metadata excludes legacy aliases

- **WHEN** customization diagnostics search prompt transform metadata
- **THEN** they expose canonical `prompt.transform.*` action IDs and do not expose legacy `promptTransform.*` aliases

#### Scenario: Registry-backed diagnostics are validated

- **WHEN** `bun test` is executed after diagnostics are wired to the action registry
- **THEN** tests cover `:actions`, `:features`, `:keymap`, `:mapcheck`, and `:vimdoctor` output for prompt transform action metadata without requiring a second prompt transform description table
