## MODIFIED Requirements

### Requirement: Search query moves to matching text

The Vim editor SHALL move the cursor to the next literal or explicitly opted-in regex match of the completed search query in the current prompt buffer, wrapping within the prompt when needed.

#### Scenario: Forward search finds later match

- **WHEN** the editor is in normal mode with prompt text containing a later match and the user enters `/` followed by a query and `Enter`
- **THEN** the cursor moves to the start of the next literal match and the completed query becomes the last search

#### Scenario: Forward search wraps to earlier match

- **WHEN** the editor is in normal mode and no later match exists after the cursor but an earlier match exists in the prompt
- **THEN** completing `/` search moves the cursor to the first wrapped literal match

#### Scenario: Search with no match is safe

- **WHEN** the editor completes a search query that does not match prompt text
- **THEN** prompt text and cursor position are unchanged and the query is not recorded as the last successful search

#### Scenario: Empty search recalls previous query

- **WHEN** the editor has a previous successful prompt search and completes `/` or `?` with an empty query
- **THEN** the editor reuses the previous successful query and matcher mode, searches in the direction requested by the current `/` or `?` entry, and updates last-search direction when a match is found

#### Scenario: Empty search without previous query is safe

- **WHEN** the editor completes `/` or `?` search with an empty query and no previous successful search exists
- **THEN** prompt text, cursor position, and last search state are unchanged

## ADDED Requirements

### Requirement: Normal and visual modes start backward prompt search

The Vim editor SHALL support `?` as a pending backward search query over the current prompt buffer wherever prompt search is supported.

#### Scenario: Start backward search from normal mode

- **WHEN** the editor is in normal mode and the user presses the resolved backward search entry key
- **THEN** the editor enters pending search state with `?` as the displayed prefix and without inserting `?` into the prompt text

#### Scenario: Backward search finds earlier match

- **WHEN** the editor is in normal mode with prompt text containing an earlier match and the user enters `?` followed by a query and `Enter`
- **THEN** the cursor moves to the start of the previous literal match and the completed query becomes the last search with backward direction

#### Scenario: Backward search wraps to later match

- **WHEN** the editor is in normal mode and no earlier match exists before the cursor but a later match exists in the prompt
- **THEN** completing `?` search moves the cursor to the last wrapped literal match

#### Scenario: Insert mode question mark remains delegated

- **WHEN** the editor is in insert mode and the user presses `?`
- **THEN** the key is delegated to Pi default editing behavior

#### Scenario: Visual backward search extends selection

- **WHEN** the editor is in visual mode and the user completes `?` search with a matching query
- **THEN** the active visual cursor moves to the previous wrapped match and the selection remains anchored at the original visual anchor

#### Scenario: Operator backward search uses addressed range

- **WHEN** the editor has a pending delete, change, or yank operator and the user completes `?` search with a matching query
- **THEN** the operator applies to the range from the operator start through the addressed backward search match using the same register and mode-transition semantics as forward search motion

### Requirement: Repeat search respects original search direction and matcher mode

The Vim editor SHALL repeat the last successful prompt search using its recorded direction and matcher mode.

#### Scenario: Repeat backward search with n

- **WHEN** the previous successful search was a backward `?` search and the user presses `n` in normal mode
- **THEN** the cursor moves to the previous wrapped match for that query

#### Scenario: Repeat backward search in opposite direction with N

- **WHEN** the previous successful search was a backward `?` search and the user presses `N` in normal mode
- **THEN** the cursor moves to the next wrapped match for that query

#### Scenario: Repeat regex search preserves regex mode

- **WHEN** the previous successful search used explicit regex mode and the user presses `n` or `N`
- **THEN** the next target is resolved by the same bounded regex matcher rather than literal matching

### Requirement: Search workbench keeps prompt-local history

The Vim editor SHALL keep finite in-memory history for successful search entries and expose it while pending search input is active.

#### Scenario: Successful search enters history

- **WHEN** the user completes `/todo` or `?todo` and a match is found
- **THEN** the normalized search entry is added to search history without changing prompt text

#### Scenario: Failed search does not enter history

- **WHEN** the user completes a search that has no match, has invalid regex syntax, or exceeds regex bounds
- **THEN** that entry is not added to search history

#### Scenario: Search history previous recalls entry

- **WHEN** pending search input is active and search history contains an older entry
- **THEN** pressing the resolved history-previous key replaces the pending search text and matcher mode with that history entry without moving the prompt cursor

#### Scenario: Search history next restores newer entry or draft

- **WHEN** pending search input is active after history-previous navigation
- **THEN** pressing the resolved history-next key moves toward newer history entries and eventually restores the draft text that existed before history navigation

#### Scenario: New editor has empty search history

- **WHEN** a new `VimEditor` instance is constructed
- **THEN** search history starts empty and no search text is recalled until a successful search occurs in that editor instance

### Requirement: Search supports explicit bounded regex mode

The Vim editor SHALL support regex search only when the pending search text explicitly opts in with the documented regex prefix.

#### Scenario: Regex search finds matching text

- **WHEN** the user completes `/\rTODO|FIXME` in a prompt containing `FIXME`
- **THEN** the editor treats `TODO|FIXME` as a bounded regex pattern, moves the cursor to the regex match, records regex mode in last-search state, and does not include the `\r` prefix in the effective pattern

#### Scenario: Literal search remains default

- **WHEN** the user completes `/TODO|FIXME` without the regex prefix
- **THEN** the editor searches for the literal text `TODO|FIXME`

#### Scenario: Invalid regex is safe

- **WHEN** the user completes a regex search with invalid pattern syntax
- **THEN** prompt text, cursor position, visual selection, pending operator effects, and last-search state remain unchanged and the workbench reports a readable error

#### Scenario: Regex bound exceeded is safe

- **WHEN** a regex search pattern or prompt text exceeds the documented regex search bounds
- **THEN** prompt text, cursor position, visual selection, pending operator effects, and last-search state remain unchanged and the workbench reports a readable error

#### Scenario: Zero-length regex match is rejected

- **WHEN** a regex search would resolve to a zero-length match
- **THEN** prompt text, cursor position, visual selection, pending operator effects, and last-search state remain unchanged and the workbench reports a readable error

### Requirement: Search workbench behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for backward search, history, recall, and regex mode.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover `/`, `?`, cancellation, empty-query recall, history navigation, literal matching, bounded regex matching, invalid regex safety, wrap-around, no-match behavior, `n` and `N`, visual search, operator search, and insert-mode delegation

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide describes safe search workbench

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `/`, `?`, `n`, `N`, search history, empty-query recall, literal default behavior, regex opt-in syntax, regex bounds, and current search limitations
