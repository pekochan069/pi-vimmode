# vim-runtime-inspectability Specification

## Purpose

TBD - created by archiving change architecture-runway-sprint-with-inspectability. Update Purpose after archive.
## Requirements
### Requirement: Prompt-local inspect command summarizes current editor state

The Vim editor SHALL expose a read-only `:vimmode inspect` diagnostic that summarizes the active prompt editor state without dumping raw prompt contents.

#### Scenario: Inspect reports modal and cursor summary

- **WHEN** the editor executes `:vimmode inspect` from normal mode
- **THEN** it shows a bounded diagnostic message including current mode, cursor line/column, pending modal state summary, search/Ex/workbench summary, and render-layer summary

#### Scenario: Inspect reports visual selection summary

- **WHEN** the editor executes `:vimmode inspect` after opening Ex command-line mode from visual, visual-line, or visual-block mode
- **THEN** it reports the visual mode kind and selection summary without replacing the captured visual selection with raw selected prompt text

#### Scenario: Inspect reports storage summaries

- **WHEN** registers, named registers, marks, macro slots, search history, or Ex history exist
- **THEN** `:vimmode inspect` reports slots, counts, types, positions, and bounded previews only, without showing full register contents, full macro token streams, or full prompt text

#### Scenario: Inspect rejects unsupported subcommands

- **WHEN** the user executes `:vimmode dump`, `:vimmode inspect raw`, or another unsupported inspect subcommand
- **THEN** the editor reports a bounded Ex error and prompt text remains unchanged

### Requirement: Message history is bounded and separate from transient feedback

The Vim editor SHALL keep a bounded prompt-local diagnostic message history that `:messages` can display without replacing the existing transient Ex/workbench message row semantics.

#### Scenario: Messages command shows recent messages

- **WHEN** recent Ex errors, Ex success messages, inspect diagnostics, customization diagnostics, or enabled no-op/protected-shortcut feedback have been recorded and the user executes `:messages`
- **THEN** the editor shows a bounded summary of recent messages in chronological order or clearly identified recent-first order

#### Scenario: Message history has a fixed cap

- **WHEN** more diagnostic messages are recorded than the implementation cap allows
- **THEN** older entries are discarded and `:messages` shows only the retained bounded set

#### Scenario: Transient Ex message remains independent

- **WHEN** a command sets the transient Ex row message and the message is also recorded in message history
- **THEN** the transient row can still clear on the next handled input while `:messages` can later show the retained history entry

#### Scenario: Messages avoid raw prompt dumps

- **WHEN** recorded events involve edits, searches, registers, marks, macros, visual selections, or substitutions
- **THEN** message history stores bounded human-readable summaries rather than full prompt text, full register contents, or full macro input streams

### Requirement: Inspectability diagnostics preserve editing state

Runtime inspectability diagnostics SHALL be read-only with respect to prompt-buffer content and modal editing state except for bounded diagnostic feedback display and message-history recording.

#### Scenario: Inspect preserves normal editing state

- **WHEN** the user executes `:vimmode inspect` from normal mode
- **THEN** prompt text, cursor position, mode, registers, named registers, marks, macro slots, last search, visible search highlights, Ex history, and repeat-change state remain unchanged except for diagnostic feedback/message history

#### Scenario: Messages preserves normal editing state

- **WHEN** the user executes `:messages` from normal mode
- **THEN** prompt text, cursor position, mode, registers, named registers, marks, macro slots, search state, visible search highlights, and repeat-change state remain unchanged except for diagnostic feedback/message history

#### Scenario: Visual inspect restores source visual state

- **WHEN** Ex command-line mode was opened from a visual selection and the user executes `:vimmode inspect`
- **THEN** Ex command-line mode closes without editing prompt text and the original visual mode, visual anchor, and visual cursor are restored according to existing visual Ex diagnostic behavior

#### Scenario: Visual messages restores source visual state

- **WHEN** Ex command-line mode was opened from a visual selection and the user executes `:messages`
- **THEN** Ex command-line mode closes without editing prompt text and the original visual mode, visual anchor, and visual cursor are restored according to existing visual Ex diagnostic behavior

### Requirement: Inspectability output is finite and documented

The inspectability surface SHALL document exact supported command syntax, output scope, redaction limits, and non-goals.

#### Scenario: Feature guide documents inspect commands

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `:vimmode inspect`, `:messages`, the summarized state categories, message retention limits, and the fact that raw prompt dumps and full Vim diagnostics are unsupported

#### Scenario: Automated validation covers inspectability

- **WHEN** `bun test` is executed
- **THEN** tests cover inspect output categories, bounded message history, redaction of large prompt/register/macro content, read-only state preservation, and unsupported inspect command errors

### Requirement: Keybinding popup remains separate from message history

Runtime keybinding popup output and popup-local scroll events SHALL remain separate from retained runtime message history and SHALL NOT turn `:messages` into a help or popup log.

#### Scenario: Popup output is not retained as message history

- **WHEN** the editor executes `:features keybindings` and then executes `:messages`
- **THEN** `:messages` does not include the popup content as a retained runtime message

#### Scenario: Popup scroll is not retained as message history

- **WHEN** the editor opens the keybinding discovery popup and scrolls within it
- **THEN** retained message history does not grow solely because popup scroll position changed

#### Scenario: Repeated popup display does not pollute messages

- **WHEN** the editor opens and dismisses the keybinding discovery popup multiple times
- **THEN** retained message history does not grow solely because popup content was shown or dismissed

#### Scenario: Existing message retention remains unchanged

- **WHEN** retained Ex errors, Ex success messages, inspect diagnostics, customization diagnostics, or enabled no-op feedback exist before the popup is opened
- **THEN** opening, scrolling, or dismissing the keybinding discovery popup does not remove, reorder, or duplicate those retained messages

### Requirement: Keybinding popup avoids raw prompt dumps

Runtime keybinding popup output SHALL summarize keybinding metadata without dumping raw prompt contents or large internal editor state.

#### Scenario: Popup content omits prompt text

- **WHEN** the current prompt contains arbitrary user text and the editor executes `:features keybindings`
- **THEN** the popup output does not include raw prompt text, register contents, macro token streams, mark tables, search history contents, or visual selection text

#### Scenario: Popup content stays diagnostic in scope

- **WHEN** the keybinding discovery popup is visible
- **THEN** it describes finite keybinding discovery metadata and does not expose a raw inspect dump or persistent runtime log

