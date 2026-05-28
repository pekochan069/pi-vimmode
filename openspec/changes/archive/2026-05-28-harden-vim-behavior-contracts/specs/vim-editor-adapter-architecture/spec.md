## ADDED Requirements

### Requirement: Real-editor scenarios validate behavior contracts

The Vim editor SHALL include test-only scenarios that exercise behavior through the actual `VimEditor` adapter when a contract can be broken by construction, option cloning, effect application, or adapter state integration.

#### Scenario: Adapter scenario covers option propagation

- **WHEN** a behavior option is configured through `VimEditor` construction
- **THEN** at least one real-editor scenario verifies that the option affects live editor behavior rather than only modal-engine behavior

#### Scenario: Adapter scenario harness remains test-only

- **WHEN** real-editor scenarios are added
- **THEN** they reuse or add test helpers under the test suite without introducing a new production editor-driver seam

#### Scenario: Focused modal tests retain locality

- **WHEN** behavior is validated through real-editor scenarios
- **THEN** focused modal-engine tests still cover the underlying state and effect contracts needed to diagnose failures locally
