## ADDED Requirements

### Requirement: Inspect and message diagnostics are effective-runtime views

Runtime diagnostics SHALL report the effective editor state and configuration available to the current prompt editor rather than raw settings tables or stale implementation defaults.

#### Scenario: Inspect reflects resolved feature availability

- **WHEN** `:vimmode inspect` runs with a preset or resolved options that disable macros, marks, prompt transforms, search highlights, or status items
- **THEN** the diagnostic reflects the effective enabled/disabled state instead of advertising unavailable actions as active behavior

#### Scenario: Messages reflects retained runtime events

- **WHEN** `:messages` runs after diagnostics, Ex errors, Ex successes, or enabled no-op feedback have occurred in the current editor session
- **THEN** it reports retained runtime message events rather than rereading settings files or reconstructing messages from raw config

#### Scenario: Diagnostics include existing warnings when relevant

- **WHEN** retained settings diagnostics contain invalid fields, protected key warnings, or keymap conflicts and the user runs `:vimmode inspect`
- **THEN** the inspect output includes a bounded warning summary without replacing `:vimdoctor` as the detailed customization health command

### Requirement: Inspect and message diagnostics preserve customization state boundaries

Inspectability diagnostics SHALL follow the same read-only state boundaries as existing customization diagnostics.

#### Scenario: Inspect does not mutate effective keymaps or options

- **WHEN** the user executes `:vimmode inspect`
- **THEN** resolved options, effective keymaps, feature enablement, protected shortcut handling, and retained diagnostics remain unchanged

#### Scenario: Messages does not mutate effective keymaps or options

- **WHEN** the user executes `:messages`
- **THEN** resolved options, effective keymaps, feature enablement, protected shortcut handling, and retained diagnostics remain unchanged

#### Scenario: Diagnostic output remains bounded with large state

- **WHEN** prompt text, registers, search history, Ex history, macro slots, marks, or diagnostics are large
- **THEN** `:vimmode inspect` and `:messages` truncate or summarize output so the diagnostic feedback remains bounded and width-safe

### Requirement: Diagnostic command registry remains finite

The customization diagnostic surface SHALL add inspectability commands explicitly rather than turning diagnostics into arbitrary action or command execution.

#### Scenario: Supported diagnostics are explicit

- **WHEN** the user searches or inspects supported diagnostic commands through runtime help or action diagnostics
- **THEN** `vimdoctor`, `keymap`, `mapcheck`, `actions`, `vimmode inspect`, and `messages` are presented as finite supported diagnostics when available

#### Scenario: Unsupported diagnostic names remain unsupported

- **WHEN** the user executes unsupported diagnostic-like commands such as `:map`, `:actionspalette`, `:vimmode dump`, or `:messages clear`
- **THEN** the editor reports a bounded unsupported-command error and leaves prompt editing state unchanged

#### Scenario: Diagnostic docs reject broad parity claims

- **WHEN** user-facing docs describe customization and inspectability diagnostics
- **THEN** they identify the finite command set and do not imply full Vim `:messages`, `:map`, `:verbose`, or Vimscript support
