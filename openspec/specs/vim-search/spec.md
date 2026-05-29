# vim-search Specification

## Purpose
TBD - created by archiving change todos-search-functionality. Update Purpose after archive.
## Requirements
### Requirement: Normal mode starts forward prompt search

The Vim editor SHALL support `/` in normal mode as a pending literal search query over the current prompt buffer.

#### Scenario: Start search from normal mode

- **WHEN** the editor is in normal mode and the user presses `/`
- **THEN** the editor enters pending search state without inserting `/` into the prompt text

#### Scenario: Insert mode slash remains delegated

- **WHEN** the editor is in insert mode and the user presses `/`
- **THEN** the key is delegated to Pi default editing and slash-command completion behavior remains available

#### Scenario: Cancel pending search

- **WHEN** the editor is collecting a search query and the user presses `Esc`
- **THEN** pending search clears, prompt text is unchanged, and the editor returns to normal mode

### Requirement: Search query moves to matching text

The Vim editor SHALL move the cursor to the next literal match of the completed search query in the current prompt buffer, wrapping within the prompt when needed.

#### Scenario: Forward search finds later match

- **WHEN** the editor is in normal mode with prompt text containing a later match and the user enters `/` followed by a query and `Enter`
- **THEN** the cursor moves to the start of the next literal match and the completed query becomes the last search

#### Scenario: Forward search wraps to earlier match

- **WHEN** the editor is in normal mode and no later match exists after the cursor but an earlier match exists in the prompt
- **THEN** completing `/` search moves the cursor to the first wrapped literal match

#### Scenario: Search with no match is safe

- **WHEN** the editor completes a search query that does not match prompt text
- **THEN** prompt text and cursor position are unchanged and the query is not recorded as the last successful search

#### Scenario: Empty search is safe

- **WHEN** the editor completes `/` search with an empty query
- **THEN** prompt text, cursor position, and last search state are unchanged

### Requirement: Normal mode repeats search

The Vim editor SHALL support `n` and `N` in normal mode to repeat the last successful search over the current prompt buffer.

#### Scenario: Repeat search forward

- **WHEN** the editor has a successful forward search query and the user presses `n` in normal mode
- **THEN** the cursor moves to the next wrapped literal match for that query

#### Scenario: Repeat search backward

- **WHEN** the editor has a successful forward search query and the user presses `N` in normal mode
- **THEN** the cursor moves to the previous wrapped literal match for that query

#### Scenario: Repeat search without prior query is safe

- **WHEN** the editor is in normal mode without a successful previous search and the user presses `n` or `N`
- **THEN** prompt text and cursor position are unchanged

### Requirement: Search works as visual motion

The Vim editor SHALL allow completed search movement to extend active visual selections without changing prompt text until a visual operation is chosen.

#### Scenario: Visual search extends selection

- **WHEN** the editor is in visual mode and the user completes `/` search with a matching query
- **THEN** the active visual cursor moves to the match and selection remains anchored at the original visual anchor

#### Scenario: Visual repeat search extends selection

- **WHEN** the editor is in visual mode with a previous successful search and the user presses `n` or `N`
- **THEN** the active visual cursor moves to the repeated search match and visual mode remains active

#### Scenario: Visual search no match preserves selection

- **WHEN** the editor is in visual mode and completed search has no match
- **THEN** prompt text, visual anchor, active cursor, and mode are unchanged

### Requirement: Search works as operator motion

The Vim editor SHALL allow completed search movement to provide an operator target range for supported normal-mode operators.

#### Scenario: Delete to search match

- **WHEN** the editor is in normal mode and the user enters a delete operator followed by `/`, a matching query, and `Enter`
- **THEN** text from the operator start through the addressed search range is removed, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Change to search match

- **WHEN** the editor is in normal mode and the user enters a change operator followed by `/`, a matching query, and `Enter`
- **THEN** text from the operator start through the addressed search range is removed, copied to the unnamed character register, and the editor enters insert mode

#### Scenario: Yank to search match

- **WHEN** the editor is in normal mode and the user enters a yank operator followed by `/`, a matching query, and `Enter`
- **THEN** text from the operator start through the addressed search range is copied to the unnamed character register without changing prompt text

#### Scenario: Operator search no match clears pending operator safely

- **WHEN** the editor has a pending operator and completed search has no match
- **THEN** the pending operator clears, prompt text is unchanged, and the editor remains in normal mode

### Requirement: Search behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for supported search behavior.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover pending search, cancellation, literal matching, wrap-around, no-match behavior, `n` and `N`, visual search, operator search, and insert-mode slash delegation

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Documentation describes search

- **WHEN** the user opens the project README
- **THEN** it documents `/`, `n`, `N`, prompt-local literal search behavior, and current search limitations

#### Scenario: TODO marks search complete after validation

- **WHEN** the search implementation and validation pass
- **THEN** `TODOS.md` marks `/` search complete while leaving unrelated remaining TODO items unchanged

