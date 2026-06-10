## ADDED Requirements

### Requirement: Runtime discovery includes dedicated keybindings command

Runtime help and feature discovery SHALL identify `:keybindings` as the dedicated source-backed keybinding discovery entry point while preserving existing `:features keybindings` behavior.

#### Scenario: General help lists keybindings entry point

- **WHEN** the editor displays general runtime help or feature discovery summaries
- **THEN** the output names `:keybindings` as a finite read-only popup command for effective keybinding discovery

#### Scenario: Existing features keybindings remains supported

- **WHEN** the editor executes `:features keybindings`
- **THEN** it continues to open source-backed keybinding discovery popup output rather than becoming unsupported or silently changing meaning

#### Scenario: Unsupported mapping queries remain finite

- **WHEN** runtime help or feature discovery receives unsupported mapping-oriented queries such as `vimscript mappings`, `runtime map`, or `nmap`
- **THEN** it returns finite no-match output and does not imply full Vim mapping support

### Requirement: Drift guard validates keybindings popup command coverage

The project SHALL validate that the dedicated keybindings popup command stays aligned across parser support, popup metadata, runtime help, user docs, specs, and tests.

#### Scenario: Keybindings command missing from docs fails validation

- **WHEN** source-backed popup command metadata lists `:keybindings` and `docs/features.md` lacks the corresponding read-only popup documentation anchor or command mention
- **THEN** docs drift validation fails with an actionable message identifying the missing keybindings command coverage

#### Scenario: Keybindings command missing from finite parser fails validation

- **WHEN** source-backed popup command metadata lists `:keybindings`
- **THEN** automated validation verifies that the finite Ex parser supports `keybindings` with optional query syntax

#### Scenario: Keybindings command missing from tests fails validation

- **WHEN** runtime help, diagnostic metadata, or popup metadata references `:keybindings`
- **THEN** automated validation verifies that at least one test anchor covers parser/runtime popup behavior and one test anchor covers docs or metadata drift

#### Scenario: Keybindings non-goals stay documented

- **WHEN** user-facing docs describe `:keybindings`
- **THEN** docs state that it is finite read-only discovery and does not provide runtime `:map`, recursive mappings, Vimscript, a command palette, plugin dispatch, or default action keybindings

#### Scenario: Keybinding catalog references registry-backed actions

- **WHEN** keybindings popup output references `prompt.transform.*` action IDs or `vimmode.*` diagnostic/help metadata IDs
- **THEN** automated validation verifies that those IDs remain backed by the appropriate source registry and docs anchors
