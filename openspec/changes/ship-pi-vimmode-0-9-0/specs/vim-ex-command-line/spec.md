## ADDED Requirements

### Requirement: Ex command-line supports exact changelog command

The Vim editor SHALL parse and execute exact `:changelog` as finite read-only Ex command that opens current-version packaged release notes in existing read-only popup.

#### Scenario: Changelog command opens from normal mode

- **WHEN** Ex command-line mode was opened from normal mode and user executes `:changelog`
- **THEN** Ex input closes, editor remains in normal mode, and changelog popup opens

#### Scenario: Changelog command opens from visual mode

- **WHEN** Ex command-line mode was opened from visual, visual-line, or visual-block mode and user executes the prefilled `:'<,'>changelog`
- **THEN** the visual source range is accepted without filtering release content
- **AND** Ex input closes, original visual mode and valid captured selection are restored, and changelog popup opens

#### Scenario: Unsupported changelog abbreviation is rejected

- **WHEN** user executes `:change`, `:changel`, or another unsupported abbreviation
- **THEN** finite Ex parser reports existing readable unsupported-command feedback
- **AND** does not open changelog popup

#### Scenario: Changelog arguments and unsupported ranges are rejected

- **WHEN** user executes `:changelog` with unsupported argument or a range other than prefilled visual source range
- **THEN** finite Ex parser reports readable error
- **AND** leaves prompt text unchanged

#### Scenario: Unavailable release content still uses popup

- **WHEN** runtime release asset is missing, invalid, or version mismatched and user executes `:changelog`
- **THEN** Ex command opens ordinary read-only popup with explicit unavailable content and repository release URL
- **AND** does not crash or show stale release

### Requirement: Changelog Ex command is side-effect bounded

Executing, scrolling, and dismissing `:changelog` SHALL NOT mutate prompt-editing state beyond existing successful Ex history semantics and bounded popup state.

#### Scenario: Changelog preserves normal editing state

- **WHEN** user executes `:changelog` after repeatable edit
- **THEN** prompt text, cursor, registers, marks, macros, search state, undo/redo, resolved options, diagnostics, and repeat target remain unchanged

#### Scenario: Changelog preserves visual source state

- **WHEN** user opens changelog from visual Ex command-line
- **THEN** valid visual mode and selection are restored around popup behavior
- **AND** prompt text remains unchanged

#### Scenario: Changelog does not become repeat change

- **WHEN** user closes changelog and invokes repeat-change command
- **THEN** previous supported edit repeats rather than changelog command

#### Scenario: Popup interaction does not pollute messages

- **WHEN** user scrolls or dismisses changelog popup
- **THEN** retained runtime message history does not grow solely due popup interaction
