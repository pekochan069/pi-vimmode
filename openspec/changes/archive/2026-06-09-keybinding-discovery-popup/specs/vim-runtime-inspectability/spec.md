## ADDED Requirements

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
