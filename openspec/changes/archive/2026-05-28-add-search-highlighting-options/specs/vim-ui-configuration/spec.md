## ADDED Requirements

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
