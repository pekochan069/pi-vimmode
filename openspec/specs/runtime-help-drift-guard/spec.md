# runtime-help-drift-guard Specification

## Purpose
TBD - created by archiving change runtime-help-docs-spec-drift-guard. Update Purpose after archive.
## Requirements
### Requirement: Runtime help is finite and source-backed

The Vim editor SHALL provide finite runtime help that describes supported pi-vimmode behavior and explicit limitations without implying full Vim or Neovim parity.

#### Scenario: General help lists entry points

- **WHEN** the editor executes `:help` with no topic
- **THEN** the editor shows a compact transient help message that names supported entry points such as `:help <topic>`, `:features [query]`, `:messages`, `:actions`, `:keymap`, `:mapcheck`, and `:vimdoctor`

#### Scenario: Topic help describes supported behavior and limits

- **WHEN** the editor executes `:help search`, `:help ex`, or another supported topic
- **THEN** the editor shows a compact transient message based on source-backed help metadata that includes supported pi-vimmode behavior and at least one relevant limitation when the topic has known limits

#### Scenario: Unknown help topic is rejected without parity fallback

- **WHEN** the editor executes `:help vimscript` or another topic that has no supported help entry
- **THEN** the editor shows a transient no-match message and does not fall back to Vim help tags, Vimscript documentation, or external files

### Requirement: Feature matrix is discoverable and searchable

The Vim editor SHALL expose a searchable runtime feature matrix for supported pi-vimmode feature areas, commands, actions, and limits.

#### Scenario: Feature list summarizes categories

- **WHEN** the editor executes `:features` with no query
- **THEN** the editor shows a compact transient summary of supported feature categories such as modes, motions, editing, search, Ex commands, prompt transforms, registers, marks, macros, customization diagnostics, settings, and Pi shortcut compatibility

#### Scenario: Feature query finds supported command

- **WHEN** the editor executes `:features nohlsearch`
- **THEN** the editor reports that `:noh` / `:nohlsearch` are supported for clearing visible prompt search highlights while preserving repeat-search state

#### Scenario: Feature query finds semantic action

- **WHEN** the editor executes `:features redo` and redo is present in the resolved keymap
- **THEN** the editor reports the matching supported action and its current binding when one exists

#### Scenario: Feature query reports disabled runtime options

- **WHEN** the editor executes `:features macros` in an editor whose macro support is disabled by resolved options
- **THEN** the editor reports that macro controls are disabled for the current editor rather than describing them as active

#### Scenario: Feature query rejects unsupported behavior

- **WHEN** the editor executes `:features vimscript` or another query that matches no supported finite feature
- **THEN** the editor shows a transient no-match message rather than inventing unsupported Vim behavior

### Requirement: Runtime messages are inspectable

The Vim editor SHALL allow users to inspect recent runtime messages without adding a pager or persistent log.

#### Scenario: Messages command reports recent message state

- **WHEN** the editor has emitted one or more transient runtime messages and then executes `:messages`
- **THEN** the editor shows a compact transient summary containing the retained message count and the most recent retained message

#### Scenario: Messages command handles empty history

- **WHEN** the editor executes `:messages` before any runtime messages have been retained
- **THEN** the editor shows a compact transient message indicating that no runtime messages are retained

#### Scenario: Messages history is bounded

- **WHEN** the editor emits more runtime messages than the retained history cap
- **THEN** older messages are discarded and `:messages` reports only bounded recent message state

#### Scenario: Messages introspection does not pollute history

- **WHEN** the editor executes `:messages` repeatedly
- **THEN** the `:messages` output itself is not appended to the retained message history

### Requirement: Runtime help commands preserve prompt editing state

Runtime help and feature discovery SHALL be read-only with respect to prompt editing state.

#### Scenario: Help command leaves editing state unchanged

- **WHEN** the editor executes `:help`, `:features`, or `:messages`
- **THEN** prompt text, cursor position, mode, visual selection, search highlights, registers, marks, macro slots, macro replay state, and dot-repeat state remain unchanged except for the transient informational message

#### Scenario: Help command from visual Ex restores visual state

- **WHEN** Ex command-line mode was opened from a visual selection, the user deletes the prefilled visual range marker, and the user executes `:help`, `:features`, or `:messages`
- **THEN** the command exits Ex mode without editing prompt text and restores the original visual mode state according to existing Ex cancellation behavior

### Requirement: Docs drift guard validates runtime help contracts

The project SHALL include development-time validation that fails when user-facing docs, source-backed runtime help metadata, durable specs, or test anchors contradict each other for supported pi-vimmode behavior.

#### Scenario: Supported command missing from docs fails validation

- **WHEN** source-backed help metadata lists a supported runtime command and `docs/features.md` lacks its required docs anchor
- **THEN** the docs drift guard fails in the normal validation path

#### Scenario: Stale unsupported claim fails validation

- **WHEN** user-facing docs claim `:noh`, `:nohlsearch`, or another source-supported command is unsupported
- **THEN** the docs drift guard fails with an actionable message identifying the contradictory claim

#### Scenario: Missing spec or test anchor fails validation

- **WHEN** a source-backed feature registry entry lacks a required OpenSpec spec anchor or test anchor without an explicit approved exception
- **THEN** the docs drift guard fails before the change is considered complete

