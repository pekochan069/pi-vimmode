## ADDED Requirements

### Requirement: Customization metadata supports runtime feature discovery

The Vim editor SHALL reuse the existing semantic action, keymap, prompt transform, macro, mark, and protected shortcut metadata for broader runtime feature discovery without weakening existing customization diagnostic commands.

#### Scenario: Feature search reuses current action bindings

- **WHEN** the editor executes `:features redo` and the resolved keymap binds redo to `ctrl+r`
- **THEN** the feature result reports redo using the same effective binding vocabulary as `:actions redo` or `:keymap redo`

#### Scenario: Protected shortcut feature search reuses protected catalog

- **WHEN** the editor executes `:features ctrl+p`
- **THEN** the feature result describes the protected Pi shortcut using the same ownership reason and behavior vocabulary as `:mapcheck ctrl+p`

#### Scenario: Customization diagnostics keep their existing scope

- **WHEN** the editor executes `:actions`, `:keymap`, `:mapcheck`, or `:vimdoctor` after runtime help support is added
- **THEN** those commands keep their existing action-focused, keymap-focused, key-checking, and doctor-summary behavior rather than becoming general help or docs browsers

### Requirement: Feature discovery reflects effective customization state

Runtime feature discovery SHALL describe the current editor's effective customization state when a feature area is disabled, renamed, or restricted by resolved pi-vimmode options.

#### Scenario: Disabled prompt transform is reported as disabled

- **WHEN** the editor executes `:features reflow` and the resolved prompt transform options disable the `reflow` action
- **THEN** the feature result reports that `reflow` is disabled for the current editor rather than describing it as an active Ex transform

#### Scenario: Renamed prompt transform command is discoverable

- **WHEN** the editor executes `:features quote` and the resolved prompt transform options rename the quote command
- **THEN** the feature result includes the current command name that users should execute for the quote transform

#### Scenario: Restricted mark slots are reported

- **WHEN** the editor executes `:features marks` and resolved mark options restrict allowed mark slots
- **THEN** the feature result reports that marks are enabled with the current slot limits rather than listing unrestricted mark support
