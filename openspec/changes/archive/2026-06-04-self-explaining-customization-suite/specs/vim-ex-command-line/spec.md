## ADDED Requirements

### Requirement: Ex command-line supports read-only customization commands

The Vim editor SHALL parse and execute finite read-only Ex commands for customization diagnostics.

#### Scenario: Vimdoctor command executes

- **WHEN** Ex command-line mode is active and the user executes `:vimdoctor`
- **THEN** the editor exits Ex command-line mode and shows a transient customization diagnostic message

#### Scenario: Keymap command executes with optional query

- **WHEN** Ex command-line mode is active and the user executes `:keymap` or `:keymap redo`
- **THEN** the editor exits Ex command-line mode and shows a transient message describing matching effective keymap entries

#### Scenario: Mapcheck command requires a query

- **WHEN** Ex command-line mode is active and the user executes `:mapcheck ctrl+p`
- **THEN** the editor exits Ex command-line mode and shows a transient message explaining the queried key or key sequence

#### Scenario: Actions command executes with optional query

- **WHEN** Ex command-line mode is active and the user executes `:actions` or `:actions search`
- **THEN** the editor exits Ex command-line mode and shows a transient message listing or searching supported finite actions

### Requirement: Diagnostic Ex command parsing stays finite

The Ex parser SHALL support customization diagnostics through explicit command names rather than Vimscript evaluation, recursive mappings, or arbitrary command dispatch.

#### Scenario: Supported diagnostic command names parse

- **WHEN** the parser receives `vimdoctor`, `keymap`, `mapcheck`, or `actions` with valid arguments
- **THEN** it returns a finite parse result for that diagnostic command

#### Scenario: Unsupported diagnostic abbreviation is rejected

- **WHEN** the parser receives an unsupported abbreviation or unknown command such as `:vimd`, `:map`, or `:actionspalette`
- **THEN** it returns an Ex error and prompt text remains unchanged

#### Scenario: Diagnostic command arguments are bounded

- **WHEN** a diagnostic command receives an empty required argument, unsupported key notation, or an over-broad query
- **THEN** the editor reports a bounded Ex error or no-match diagnostic and prompt text remains unchanged

### Requirement: Diagnostic Ex commands are side-effect bounded

Read-only diagnostic Ex commands SHALL NOT perform prompt-buffer edits or editing-state mutations beyond transient message display.

#### Scenario: Diagnostic command does not write registers

- **WHEN** the user executes `:keymap`, `:mapcheck`, `:actions`, or `:vimdoctor`
- **THEN** unnamed and named edit registers keep their previous values

#### Scenario: Diagnostic command does not affect search state

- **WHEN** search highlights or a previous search query exist and the user executes a diagnostic Ex command
- **THEN** search query state, repeat search direction, and visible search highlights remain unchanged

#### Scenario: Diagnostic command does not participate in repeat change

- **WHEN** the user executes a diagnostic Ex command and then presses the repeat-change command
- **THEN** repeat-change behavior uses the previous real edit when one exists and does not repeat the diagnostic command
