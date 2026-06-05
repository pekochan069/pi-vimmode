## ADDED Requirements

### Requirement: Runtime message history is bounded and width-safe

The Vim editor SHALL retain bounded recent runtime message state for `:messages` while preserving the existing width-safe transient message row and prompt viewport bounds.

#### Scenario: Message row remains bounded

- **WHEN** the editor shows a runtime help, feature, diagnostic, success, error, or feedback message
- **THEN** the rendered message fits within the available terminal width using the same bounded row behavior as existing Ex messages

#### Scenario: Prompt viewport stays bounded with message row

- **WHEN** a retained or newly emitted runtime message is visible
- **THEN** the prompt editor viewport uses one fewer terminal row so total rendering remains within the requested height

#### Scenario: Message history cap discards oldest entries

- **WHEN** the editor emits more messages than the retained history cap
- **THEN** the oldest retained messages are discarded and current rendering remains bounded

#### Scenario: Messages output is not retained as history

- **WHEN** the editor executes `:messages`
- **THEN** the transient output of `:messages` is displayed width-safely but is not added to the retained message history

### Requirement: Runtime message display preserves editing visuals

Runtime help and message introspection SHALL compose with existing render layers without corrupting visual selection, search highlights, cursor style, or status rendering.

#### Scenario: Message display composes with visual selection

- **WHEN** a visual selection is active and a read-only runtime help command restores visual mode with an informational message
- **THEN** the visual selection remains highlighted according to the existing visual rendering rules while the message row is displayed

#### Scenario: Message display composes with search highlights

- **WHEN** prompt search highlights are visible and the editor shows a runtime help or messages informational row
- **THEN** the search highlights remain visible according to existing search rendering rules and the message row does not clear repeat-search state

#### Scenario: Message display composes with cursor style

- **WHEN** a runtime help or messages informational row is visible
- **THEN** the prompt cursor style remains derived from the current Vim mode and terminal cursor settings rather than from the message type
