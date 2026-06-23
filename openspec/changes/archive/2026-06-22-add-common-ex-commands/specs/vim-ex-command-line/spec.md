## ADDED Requirements

### Requirement: Ex command-line supports finite Pi quit commands

The Vim editor SHALL parse and execute exact `:q` and `:quit` Ex commands as requests for graceful Pi shutdown through the Pi extension runtime.

#### Scenario: Short quit command requests shutdown

- **WHEN** Ex command-line mode is active and the user executes `:q`
- **THEN** the editor exits Ex command-line mode and requests graceful Pi shutdown without changing prompt text

#### Scenario: Full quit command requests shutdown

- **WHEN** Ex command-line mode is active and the user executes `:quit`
- **THEN** the editor exits Ex command-line mode and requests graceful Pi shutdown without changing prompt text

#### Scenario: Quit preserves editing side effects before shutdown

- **WHEN** the user executes `:q` while registers, marks, search state, visible search highlights, macro state, cursor position, and dot-repeat state exist
- **THEN** those editing states remain unchanged before the shutdown request is handed to Pi

#### Scenario: Quit from visual Ex source is side-effect bounded

- **WHEN** Ex command-line mode was opened from a visual selection and the user executes `:'<,'>q`
- **THEN** the editor requests graceful Pi shutdown without changing prompt text, registers, marks, search state, macro state, or dot-repeat state

#### Scenario: Unsupported quit-like commands are rejected

- **WHEN** the user executes unsupported quit-like commands such as `:q!`, `:quit!`, `:wq`, `:x`, or `:qa`
- **THEN** the editor reports a readable Ex error, does not request shutdown, and leaves prompt text unchanged

### Requirement: Ex quit behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for supported Pi quit Ex commands and deferred common Ex commands.

#### Scenario: Automated quit validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover parsing `:q` and `:quit`, rejecting unsupported quit-like commands, modal shutdown effects, side-effect preservation, and adapter wiring to Pi graceful shutdown

#### Scenario: Feature guide describes quit scope

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `:q` and `:quit` as Pi shutdown commands and states that file/window/shell Ex commands such as `:write`, `:wq`, `:q!`, `:qa`, and `:shell` are intentionally unsupported
