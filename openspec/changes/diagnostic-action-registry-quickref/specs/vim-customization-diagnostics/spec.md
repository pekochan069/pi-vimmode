## ADDED Requirements

### Requirement: Diagnostic help actions have metadata-only registry entries

The Vim editor SHALL expose finite metadata for diagnostic and runtime-help actions without making those actions keybindable or plugin-dispatchable.

#### Scenario: Actions search finds diagnostic metadata

- **WHEN** the editor executes `:actions vimmode.doctor`, `:actions vimmode.actions`, or another supported diagnostic/help action ID
- **THEN** it shows the matching metadata entry with its canonical `vimmode.*` ID, command name, diagnostic/runtime-help classification, and metadata-only or non-bindable status

#### Scenario: Actions summary separates metadata-only diagnostics

- **WHEN** the editor executes `:actions` without a query
- **THEN** diagnostic/help metadata entries are summarized separately from bindable prompt transform actions and are not counted as prompt transforms, motions, operators, text objects, macros, marks, searches, or editing commands

#### Scenario: Unsupported diagnostic action remains unsupported

- **WHEN** the editor executes `:actions vimmode.dump`, `:actions actionspalette`, or another unsupported diagnostic-like action query
- **THEN** it shows a bounded no-match message rather than inventing a command, action, plugin API, or keybinding target

### Requirement: Diagnostic action metadata preserves diagnostic command boundaries

Diagnostic/help action metadata SHALL describe existing finite diagnostics without changing execution or editing side effects.

#### Scenario: Metadata entry points to existing Ex command

- **WHEN** a metadata entry names `vimmode.doctor`, `vimmode.actions`, `vimmode.keymap`, `vimmode.mapcheck`, `vimmode.help`, `vimmode.features`, `vimmode.messages`, or `vimmode.inspect`
- **THEN** the described command is one of the explicit supported diagnostic/runtime-help Ex commands and no additional dispatch path is implied

#### Scenario: Metadata lookup is read-only

- **WHEN** the editor executes `:actions vimmode.help` or another metadata lookup from normal or visual Ex mode
- **THEN** prompt text, cursor position, mode restoration, visual selection, search highlights, registers, marks, macro slots, and dot-repeat state remain unchanged except for the transient diagnostic message and existing message-history rules

#### Scenario: Keymap diagnostics do not treat metadata-only actions as bindable

- **WHEN** the editor explains a metadata-only diagnostic/help action through keymap-oriented diagnostics
- **THEN** it reports that the action is metadata-only or not bindable rather than showing it as an unbound configurable action waiting for a user keybinding
