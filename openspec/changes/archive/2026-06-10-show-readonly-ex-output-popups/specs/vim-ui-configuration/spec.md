## ADDED Requirements

### Requirement: Read-only Ex popup overlay is bounded and adapter-owned

The Vim editor SHALL display read-only Ex help and diagnostic output through a bounded overlay owned by the Pi adapter rather than by prompt render rows.

#### Scenario: Read-only output is not appended to editor render rows

- **WHEN** a read-only Ex command such as `:help`, `:features`, `:actions`, `:keymap`, `:mapcheck`, `:messages`, `:vimmode inspect`, or `:vimdoctor` completes successfully on a terminal that can show the overlay
- **THEN** the main editor render output remains focused on the prompt/status/workbench surface and the read-only command body appears in a centered bounded overlay

#### Scenario: Overlay close controls are local

- **WHEN** the read-only popup is visible and the user presses `Esc`, `Ctrl-C`, or `Ctrl-G`
- **THEN** the popup closes without editing prompt text, moving the prompt cursor, changing registers, changing marks, changing macros, changing search state, updating dot-repeat, or delegating those keys to Pi prompt editing

#### Scenario: Overlay scroll controls are local

- **WHEN** the read-only popup content overflows and the user presses `j`, `k`, Down, or Up
- **THEN** the popup scrolls within clamped bounds without editing prompt text or moving the prompt cursor

#### Scenario: Too-small viewport uses bounded fallback

- **WHEN** a valid read-only Ex command completes but the terminal cannot fit the minimum supported overlay viewport
- **THEN** the editor provides bounded visible feedback that the popup cannot be shown at the current size without silently dropping the command result or corrupting prompt editing state

## MODIFIED Requirements

### Requirement: Runtime informational messages are width-safe

The Vim editor SHALL render compact informational feedback and read-only popup output without overflowing the editor viewport.

#### Scenario: Diagnostic output opens popup

- **WHEN** a read-only diagnostic command such as `:vimdoctor`, `:keymap`, `:mapcheck`, or `:actions` completes successfully
- **THEN** the diagnostic body is shown in a bounded read-only popup rather than appended only as one width-safe row below the prompt box

#### Scenario: Compact feedback still shrinks prompt viewport

- **WHEN** a compact diagnostic, parser error, edit success, edit error, or optional feedback message row is visible
- **THEN** the prompt editor viewport uses one fewer terminal row so total rendering remains bounded

#### Scenario: Long popup diagnostic message is fitted

- **WHEN** read-only diagnostic output is longer than the available overlay width or height
- **THEN** the popup truncates or fits rows to the available overlay width, caps visible height, and exposes local scrolling for hidden rows without corrupting prompt text rendering

#### Scenario: Compact long message is fitted

- **WHEN** a compact feedback message remains on the workbench row and is longer than the available terminal width
- **THEN** the rendered row is truncated or fitted according to existing width-safety behavior without corrupting prompt text rendering

### Requirement: Runtime message history is bounded and width-safe

The Vim editor SHALL retain bounded recent runtime message state for `:messages` while preserving the existing width-safe transient message row for compact feedback and using the read-only popup for successful `:messages` output.

#### Scenario: Message row remains bounded

- **WHEN** the editor shows a compact success, error, parser, or feedback message
- **THEN** the rendered message fits within the available terminal width using the same bounded row behavior as existing Ex messages

#### Scenario: Prompt viewport stays bounded with message row

- **WHEN** a retained or newly emitted compact runtime message is visible in the workbench row
- **THEN** the prompt editor viewport uses one fewer terminal row so total rendering remains within the requested height

#### Scenario: Message history cap discards oldest entries

- **WHEN** the editor emits more messages than the retained history cap
- **THEN** the oldest retained messages are discarded and current rendering remains bounded

#### Scenario: Messages output is not retained as history

- **WHEN** the editor executes `:messages`
- **THEN** the popup output of `:messages` is displayed width-safely but is not added to the retained message history

#### Scenario: Messages popup is width-safe

- **WHEN** `:messages` output contains more retained message lines than fit in the overlay
- **THEN** the popup fits rows to the overlay width, caps height, and supports local scrolling without appending an unbounded log below the prompt

### Requirement: Runtime message display preserves editing visuals

Runtime help, message introspection, and diagnostic popup display SHALL compose with existing render layers without corrupting visual selection, search highlights, cursor style, status rendering, or compact workbench feedback.

#### Scenario: Popup display composes with visual selection

- **WHEN** a visual selection is active and a read-only runtime help, diagnostic, or inspectability command restores visual mode while opening a popup
- **THEN** the visual selection remains highlighted according to the existing visual rendering rules while the popup is displayed above the editor surface

#### Scenario: Popup display composes with search highlights

- **WHEN** prompt search highlights are visible and the editor opens a read-only runtime help, diagnostic, or messages popup
- **THEN** the search highlights remain visible according to existing search rendering rules and popup display does not clear repeat-search state

#### Scenario: Popup display composes with cursor style

- **WHEN** a read-only runtime help, diagnostic, or messages popup is visible
- **THEN** the prompt cursor style remains derived from the current Vim mode and terminal cursor settings rather than from the popup type

#### Scenario: Compact feedback display remains supported

- **WHEN** an existing editing Ex command succeeds or fails, parser errors occur, or optional no-op feedback is enabled
- **THEN** the editor continues to show compact workbench feedback according to existing message row semantics without requiring the read-only popup path
