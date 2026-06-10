## ADDED Requirements

### Requirement: Keybinding catalog describes effective bindings

The Vim editor SHALL provide a source-backed keybinding catalog that describes the current editor's effective resolved keybindings without requiring users to inspect settings files or source code.

#### Scenario: Catalog groups supported binding categories

- **WHEN** the editor displays the keybindings catalog
- **THEN** it lists finite supported categories such as commands, motions, operators, text objects, macros, marks, searches, prompt transform actions, and protected Pi shortcuts when those categories are available

#### Scenario: Catalog reflects configured overrides

- **WHEN** resolved settings change a semantic binding such as `piVimMode.keymap.commands.redo` or accept a prompt transform action binding such as `prompt.transform.reflow`
- **THEN** the keybindings catalog reports the effective configured binding rather than only built-in defaults or raw settings text

#### Scenario: Catalog reflects disabled effective features

- **WHEN** resolved options disable macros, marks, or prompt transforms
- **THEN** the keybindings catalog does not present disabled bindings as active behavior and reports bounded disabled or unavailable state when relevant

#### Scenario: Catalog rows show mode scope

- **WHEN** the editor displays the keybindings catalog
- **THEN** each binding row is rendered as a fixed grid with key, supported mode scope, action ID, and source-backed description

#### Scenario: Ex commands and metadata are not catalog keybindings

- **WHEN** the editor displays the keybindings catalog
- **THEN** it excludes Ex commands and diagnostic/runtime-help metadata IDs because they are not keybindings and are covered by other diagnostic/help commands

#### Scenario: Protected shortcuts remain protected

- **WHEN** the keybindings catalog or detail output mentions Pi-owned shortcuts such as `ctrl+p`, `tab`, or `enter`
- **THEN** it preserves the protected shortcut vocabulary and does not present protected Pi shortcuts as available pi-vimmode bindings

### Requirement: Keybinding detail search is finite and source-backed

The Vim editor SHALL search keybinding catalog metadata across finite supported fields without inventing unsupported Vim mapping behavior.

#### Scenario: Detail search finds action by ID or description

- **WHEN** the editor displays `:keybindings redo` or `:keybindings wordForward`
- **THEN** the popup shows matching action ID, action kind, current key sequence, and source-backed description when a match exists

#### Scenario: Detail search finds key ownership

- **WHEN** the editor displays `:keybindings ctrl+p` or another key sequence query
- **THEN** the popup reports whether the key is mapped, unmapped, protected, rejected by retained diagnostics, or otherwise unsupported using the same vocabulary as customization diagnostics

#### Scenario: Detail search rejects unsupported parity queries

- **WHEN** the editor displays `:keybindings vimscript`, `:keybindings nmap`, or another query with no finite supported match
- **THEN** the popup shows a bounded no-match result rather than inventing Vimscript, recursive mapping, or command-palette behavior
