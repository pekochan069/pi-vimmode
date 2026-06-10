# vim-ui-configuration Specification

## Purpose

TBD - created by archiving change make-vimmode-configurable. Update Purpose after archive.

## Requirements

### Requirement: Status UI items are configurable

The Vim editor SHALL read `piVimMode.ui.status` to determine which status items are rendered and in what order while preserving the current status UI by default.

#### Scenario: Default status UI preserved

- **WHEN** no `piVimMode.ui` setting is configured
- **THEN** the editor shows the current mode label, pending operator when present, and visual selection summary when visual selection is active

#### Scenario: Status item order configured

- **WHEN** `piVimMode.ui.status.items` is set to a valid ordered list of supported items
- **THEN** the editor renders those enabled status items in the configured order when each item has content

#### Scenario: Status UI disabled

- **WHEN** `piVimMode.ui.status.enabled` is set to `false`
- **THEN** the editor omits Vim status items while preserving prompt editing behavior and terminal-width safety

#### Scenario: Invalid status item falls back

- **WHEN** `piVimMode.ui.status.items` contains an unsupported item name
- **THEN** the unsupported item is ignored, a warning is recorded, and supported status items remain usable

### Requirement: Mode labels are configurable

The Vim editor SHALL support configured labels for insert, normal, characterwise visual, and visual line modes.

#### Scenario: Mode labels configured

- **WHEN** `piVimMode.ui.mode.labels.normal` is set to a non-empty string and the editor is in normal mode
- **THEN** the rendered mode status uses the configured normal-mode label when width permits

#### Scenario: Narrow mode labels configured

- **WHEN** `piVimMode.ui.mode.narrowLabels.visualLine` is set to a non-empty string and available status width is narrow
- **THEN** the rendered visual-line mode status uses the configured narrow label

#### Scenario: Mode status disabled

- **WHEN** `piVimMode.ui.mode.enabled` is set to `false`
- **THEN** the mode label item is omitted from the Vim status UI

#### Scenario: Invalid mode label falls back

- **WHEN** a configured mode label is empty or not a string
- **THEN** that mode uses the default label and the rest of the UI config remains usable

### Requirement: Cursor position display is configurable

The Vim editor SHALL support optional line and column display in the Vim status UI.

#### Scenario: Cursor position enabled

- **WHEN** `piVimMode.ui.cursorPosition.enabled` is set to `true`
- **THEN** the status UI includes the current cursor line and column using the configured base and format

#### Scenario: Cursor position base configured

- **WHEN** `piVimMode.ui.cursorPosition.base` is set to `0`
- **THEN** line and column values are rendered with zero-based coordinates

#### Scenario: Cursor position format configured

- **WHEN** `piVimMode.ui.cursorPosition.format` contains `{line}` and `{column}` placeholders
- **THEN** the status UI replaces those placeholders with the current cursor line and column values

#### Scenario: Invalid cursor position config falls back

- **WHEN** cursor position config has an unsupported base or invalid format
- **THEN** the invalid field falls back to default behavior and does not fail rendering

### Requirement: Visual selection status is configurable

The Vim editor SHALL support UI config for visual selection summaries without changing selection semantics.

#### Scenario: Selection preview length configured

- **WHEN** `piVimMode.ui.selection.previewMaxChars` is set to a supported non-negative integer
- **THEN** visual selection preview text is truncated to that configured display width

#### Scenario: Selection status disabled

- **WHEN** `piVimMode.ui.selection.enabled` is set to `false`
- **THEN** active visual selections still highlight and operate normally, but selection summary text is omitted from the status UI

### Requirement: UI config is the only status configuration surface

The Vim editor SHALL use `piVimMode.ui` as the single source of truth for status display and SHALL warn when legacy `piVimMode.vimOptions` aliases are configured.

#### Scenario: Legacy Vim option aliases are ignored

- **WHEN** `piVimMode.vimOptions.showmode`, `showcmd`, or `ruler` is configured
- **THEN** the editor records a warning, ignores `vimOptions`, and renders status from `piVimMode.ui` and defaults only

### Requirement: UI configuration is width-safe, documented, and validated

The Vim editor MUST keep rendered output width-safe for every supported UI configuration.

#### Scenario: Width safety preserved

- **WHEN** Pi renders the editor at any supported terminal width with configured status items, labels, selection preview, and cursor position
- **THEN** every rendered line from the Vim editor fits within the provided width

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default UI, configured labels, disabled items, item ordering, cursor position formatting, legacy Vim option rejection, invalid config fallback, and narrow-width rendering

#### Scenario: Settings reference documents UI config

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.ui`, supported status items, label examples, cursor position examples, and unsupported full Vimscript/Neovim Lua import

### Requirement: Search highlight behavior is configurable

The Vim editor SHALL read `piVimMode.search` to control prompt search highlighting while preserving safe defaults when settings are absent or invalid.

#### Scenario: Search highlighting defaults are enabled

- **WHEN** no `piVimMode.search` setting is configured
- **THEN** successful prompt search renders all literal matches and distinctly renders the current match

#### Scenario: Search highlighting disabled

- **WHEN** `piVimMode.search.highlight` is set to `false`
- **THEN** successful prompt search moves the cursor and updates repeat search state without rendering search highlights

#### Scenario: Current match highlight disabled

- **WHEN** `piVimMode.search.highlightCurrent` is set to `false`
- **THEN** successful prompt search renders matches with one search style instead of a distinct current-match style

#### Scenario: Highlight count is bounded

- **WHEN** `piVimMode.search.maxHighlights` is configured with a supported non-negative integer
- **THEN** rendered non-current search matches are limited to that count while search motion behavior remains unchanged

#### Scenario: Invalid search config falls back

- **WHEN** `piVimMode.search` contains invalid field types or unsupported values
- **THEN** invalid fields fall back to defaults, warnings are recorded, and the rest of the configuration remains usable

### Requirement: Search highlights clear on configured events

The Vim editor SHALL clear visible search highlights on configured cancellation or editing events without corrupting repeat search state.

#### Scenario: Cancelled search clears highlights when configured

- **WHEN** search highlights are visible, `piVimMode.search.clearOnCancel` is `true`, and the user starts `/` then presses `Esc`
- **THEN** visible search highlights clear and prompt text remains unchanged

#### Scenario: Cancelled search preserves highlights when configured

- **WHEN** search highlights are visible, `piVimMode.search.clearOnCancel` is `false`, and the user starts `/` then presses `Esc`
- **THEN** existing visible search highlights remain

#### Scenario: Insert mode clears highlights when configured

- **WHEN** search highlights are visible, `piVimMode.search.clearOnInsert` is `true`, and the editor enters insert mode
- **THEN** visible search highlights clear while the previous search can still be repeated after returning to normal mode

#### Scenario: Insert mode preserves highlights when configured

- **WHEN** search highlights are visible, `piVimMode.search.clearOnInsert` is `false`, and the editor enters insert mode
- **THEN** visible search highlights remain until another configured clear event or successful search changes them

### Requirement: Search highlights are width-safe and compose with other UI states

The Vim editor SHALL render search highlights without breaking terminal-width safety, cursor rendering, or visual selection rendering.

#### Scenario: Width safety with search highlights

- **WHEN** Pi renders the editor at any supported terminal width with active search highlights
- **THEN** every rendered line from the Vim editor fits within the provided width

#### Scenario: Current match follows repeat search

- **WHEN** search highlights are visible and the user presses `n` or `N` to move to another match
- **THEN** all matches remain highlighted and the distinct current-match highlight moves to the new cursor match

#### Scenario: Visual selection has precedence over search highlight

- **WHEN** a visual selection overlaps an active search highlight
- **THEN** the visual selection styling remains visible for selected cells and search highlighting remains visible outside the selection

### Requirement: Ex command-line row is width-safe and composes with Vim UI

The Vim editor SHALL render the dedicated Ex command-line row without breaking width safety, prompt viewport bounds, status UI, visual selection rendering, search highlight rendering, or configured workbench row reservation.

#### Scenario: Ex row respects terminal width

- **WHEN** Ex command-line mode is active and Pi renders the editor at any supported terminal width
- **THEN** every rendered line, including the dedicated Ex row, fits within the provided width

#### Scenario: Ex row shrinks viewport while preserving status UI by default

- **WHEN** the Ex row is visible, status UI is enabled, and no workbench row reservation is configured
- **THEN** the prompt box and status UI render with one fewer viewport row while the Ex row renders below them

#### Scenario: Ex row uses configured reserved viewport

- **WHEN** the Ex row is visible and `piVimMode.ui.workbench.reservedRows` is greater than one
- **THEN** the prompt box and status UI render with the configured reserved-row count removed from the prompt viewport while the Ex row renders within the reserved workbench area

#### Scenario: Ex row composes with visual selection rendering

- **WHEN** Ex command-line mode was opened from a visual mode with an active selection
- **THEN** the prompt still renders the visual selection and the dedicated Ex row renders the editable Ex command text below the prompt box

#### Scenario: Ex row composes with search highlights

- **WHEN** prompt search highlights are visible and Ex command-line mode is active
- **THEN** search highlights remain visible in the prompt render and the dedicated Ex row renders below the prompt box

#### Scenario: Transient Ex message clears on next input

- **WHEN** a transient Ex error or success message is visible in the dedicated Ex row
- **THEN** the next handled input clears the message and restores the prompt viewport to its normal or configured reserved height unless Ex command-line mode is active again

### Requirement: Shared workbench row renders search and Ex input width-safely

The Vim editor SHALL render pending `/`, `?`, and `:` workbench input in a dedicated width-safe workbench area that composes with the prompt viewport, configured row reservation, and existing Vim UI.

#### Scenario: Forward search workbench row is visible

- **WHEN** forward search input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the `/` prefix and current pending search text without inserting that text into the prompt buffer

#### Scenario: Backward search workbench row is visible

- **WHEN** backward search input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the `?` prefix and current pending search text without inserting that text into the prompt buffer

#### Scenario: Ex workbench row remains visible

- **WHEN** Ex command-line input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the `:` prefix and current pending Ex command text

#### Scenario: Workbench row shrinks prompt viewport by default

- **WHEN** a search or Ex workbench row is visible for active input, preview, success, or error messaging and no workbench row reservation is configured
- **THEN** the prompt editor viewport uses one fewer terminal row so total rendering remains bounded

#### Scenario: Workbench row uses configured reserved rows

- **WHEN** `piVimMode.ui.workbench.reservedRows` is configured and a search, Ex, preview, success, or error workbench row is visible
- **THEN** the prompt editor viewport uses the greater of one active workbench row and the configured reserved-row count so total rendering remains bounded and stable

#### Scenario: Reserved idle workbench area is width-safe

- **WHEN** `piVimMode.ui.workbench.reservedRows` is greater than zero and no search, Ex, preview, success, or error workbench row is visible
- **THEN** the editor still reserves the configured blank workbench rows below the prompt while every rendered line fits within the provided width

#### Scenario: Long workbench text is truncated safely

- **WHEN** pending workbench text is longer than the available terminal width
- **THEN** the workbench row truncates or scrolls the displayed text without emitting lines wider than the terminal width

### Requirement: Workbench messages render preview, success, and error states safely

The Vim editor SHALL render workbench feedback for search errors, Ex errors, Ex success counts, and substitution match previews without breaking visual selection, search highlights, or cursor rendering.

#### Scenario: Substitution match preview is visible

- **WHEN** a substitution preview is active
- **THEN** matched target text is highlighted and the workbench row shows a readable match count plus guidance that `Enter` applies while `Esc` cancels

#### Scenario: Preview message is replaced by apply result

- **WHEN** a substitution preview is active and the user confirms it with `Enter` or `Return`
- **THEN** the preview message is replaced by the normal Ex success count message after the substitution applies

#### Scenario: Invalid regex search message is visible

- **WHEN** a pending regex search fails because the pattern is invalid or exceeds bounds
- **THEN** the workbench row shows a readable error message until the next handled input clears it

#### Scenario: Workbench message clears on next handled input

- **WHEN** a transient workbench error or success message is visible
- **THEN** the next handled input clears the message and restores the prompt viewport to its normal height unless workbench input is active again

#### Scenario: Visual selection composes with workbench row

- **WHEN** search or Ex workbench input was opened from a visual mode with an active selection
- **THEN** the prompt still renders the visual selection and the workbench row renders below the prompt box

#### Scenario: Search highlights compose with workbench row

- **WHEN** prompt search highlights are visible and search or Ex workbench input is active
- **THEN** search highlights remain visible in the prompt render and the workbench row renders below the prompt box

### Requirement: Workbench UI behavior is documented and validated

The change SHALL include automated rendering tests and user-facing documentation for shared workbench display behavior, including configured reserved workbench rows.

#### Scenario: Render validation runs

- **WHEN** `bun test` is executed
- **THEN** render tests cover `/`, `?`, and `:` workbench rows, long pending text, substitution match preview messages/highlights, transient regex errors, default viewport shrink behavior, configured reserved rows, idle reserved rows, visual selection composition, search highlight composition, and narrow terminal widths

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: User docs describe workbench row

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents where `/`, `?`, `:` workbench input, substitution match previews, counts, and errors appear and how active and configured reserved workbench rows affect prompt viewport height

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

### Requirement: Transient messages support info feedback

The Vim editor SHALL support informational transient messages in addition to existing Ex success and error messages.

#### Scenario: Info message clears on next handled input

- **WHEN** an informational diagnostic or no-op feedback message is visible and the user provides the next handled input
- **THEN** the informational message clears using the same transient lifecycle as existing Ex messages

#### Scenario: Existing Ex success and error messages remain supported

- **WHEN** an existing editing Ex command succeeds or fails
- **THEN** the editor continues to show the existing success or error message behavior without requiring no-op feedback to be enabled

#### Scenario: Message kind does not alter prompt editing state

- **WHEN** a success, error, or info message is displayed
- **THEN** the message kind affects only the transient message content and does not itself edit prompt text, registers, marks, macros, search state, or visual selection

### Requirement: No-op feedback is configurable

The Vim editor SHALL expose optional no-op feedback settings without changing the quiet default user interface.

#### Scenario: Feedback disabled preserves quiet no-ops

- **WHEN** no-op feedback is disabled and a normal-mode input is safely ignored
- **THEN** the editor does not render a new informational feedback message

#### Scenario: Feedback enabled shows bounded explanation

- **WHEN** no-op feedback is enabled and a confusing no-op occurs, such as an invalid pending operator or protected shortcut delegation
- **THEN** the editor shows one transient explanatory message in the bounded message row

#### Scenario: Invalid feedback setting falls back safely

- **WHEN** the no-op feedback setting has an unsupported type or value
- **THEN** settings resolution records a warning, ignores the invalid field, preserves valid sibling fields, and the editor uses the default quiet feedback behavior

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

### Requirement: Workbench row reservation is configurable

The Vim editor SHALL support `piVimMode.ui.workbench.reservedRows` as the Pi-native configuration surface for reserving bounded workbench rows below the prompt.

#### Scenario: Default workbench reservation preserves current layout

- **WHEN** no `piVimMode.ui.workbench.reservedRows` setting is configured and no workbench input or message is active
- **THEN** the editor reserves no idle workbench rows and preserves the existing prompt viewport height

#### Scenario: Active workbench row still appears with default reservation

- **WHEN** no `piVimMode.ui.workbench.reservedRows` setting is configured and search input, Ex input, preview, success, or error feedback is active
- **THEN** the editor reserves one workbench row for active feedback according to existing behavior

#### Scenario: Reserved rows keep idle command area visible

- **WHEN** `piVimMode.ui.workbench.reservedRows` is set to `2` and no workbench input or message is active
- **THEN** the editor reserves two width-safe rows below the prompt and the prompt viewport uses two fewer terminal rows

#### Scenario: Active feedback renders within reserved rows

- **WHEN** `piVimMode.ui.workbench.reservedRows` is set to `2` and Ex command-line mode is active
- **THEN** the Ex command text renders in the reserved workbench area without subtracting an additional row beyond the configured two rows

#### Scenario: Reserved rows are bounded

- **WHEN** `piVimMode.ui.workbench.reservedRows` is configured with an unsupported value such as a negative number, non-integer, non-number, or value greater than the documented maximum
- **THEN** settings resolution records a warning, ignores the invalid field, preserves valid sibling UI settings, and uses the default workbench reservation

#### Scenario: Live editor honors workbench reservation

- **WHEN** a live `VimEditor` is constructed with resolved `piVimMode.ui.workbench.reservedRows`
- **THEN** rendering uses the resolved reserved-row count rather than silently falling back to defaults

#### Scenario: Settings reference documents workbench reservation

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.ui.workbench.reservedRows`, default behavior, supported bounds, examples, and the relationship between reserved rows and active workbench feedback

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
