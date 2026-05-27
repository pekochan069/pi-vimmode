# prompt-buffer-operations Specification

## Purpose
TBD - created by archiving change deepen-buffer-ts-prompt-buffer-module. Update Purpose after archive.
## Requirements
### Requirement: Prompt buffer exposes operation-level navigation

The prompt buffer module SHALL expose navigation operations that resolve cursor targets for supported prompt motions without requiring callers to compose low-level line, offset, or clamp helpers.

#### Scenario: Navigate to structural buffer targets

- **WHEN** caller requests a supported structural navigation target such as buffer start, buffer end, first non-blank column, word motion, line boundary, or matching pair
- **THEN** the prompt buffer module returns the normalized cursor position for that target

#### Scenario: Navigation handles invalid or missing targets safely

- **WHEN** caller requests navigation from an out-of-bounds cursor or a matching pair that does not exist
- **THEN** the prompt buffer module clamps the cursor and returns a safe no-op or undefined target according to the operation contract

### Requirement: Prompt buffer owns visual operation mechanics

The prompt buffer module SHALL expose visual selection operations that compute selected text, summaries, delete/change results, yank registers, and linewise behavior from anchor and active positions.

#### Scenario: Characterwise visual operation executes

- **WHEN** caller performs a supported characterwise visual yank, delete, or change operation with anchor and active positions
- **THEN** the prompt buffer module returns the selected register or edit result with cursor placement matching existing visual semantics

#### Scenario: Linewise visual operation executes

- **WHEN** caller performs a supported visual line yank, delete, or change operation with anchor and active positions
- **THEN** the prompt buffer module operates on whole selected lines and returns linewise register or edit result semantics

### Requirement: Prompt buffer owns linewise operations

The prompt buffer module SHALL expose linewise prompt edit operations for current-line delete, change, yank, open above, open below, and join.

#### Scenario: Current line operation executes

- **WHEN** caller requests a supported current-line operation at a cursor position
- **THEN** the prompt buffer module returns the appropriate edit result or line register while preserving editable empty-prompt behavior

#### Scenario: Join line operation handles last line

- **WHEN** caller requests join on the last line of the prompt
- **THEN** the prompt buffer module returns a no-op result without corrupting prompt text or cursor state

### Requirement: Prompt buffer owns operator-motion operations

The prompt buffer module SHALL expose operator-motion operations for supported delete, change, and yank commands without requiring callers to manually compute text ranges.

#### Scenario: Delete or change by motion executes

- **WHEN** caller requests delete or change with a supported motion from a cursor position
- **THEN** the prompt buffer module computes the affected range and returns an edit result with matching register and cursor semantics

#### Scenario: Yank by motion executes

- **WHEN** caller requests yank with a supported motion from a cursor position
- **THEN** the prompt buffer module computes the affected range and returns the matching characterwise register without mutating prompt text

### Requirement: Prompt buffer owns paste operations

The prompt buffer module SHALL expose paste operations for characterwise and linewise registers both before and after the cursor or current line.

#### Scenario: Character register paste executes

- **WHEN** caller pastes a characterwise register before or after the cursor
- **THEN** the prompt buffer module inserts the text at the correct prompt offset and returns the resulting cursor position

#### Scenario: Line register paste executes

- **WHEN** caller pastes a linewise register before or after the current line
- **THEN** the prompt buffer module inserts whole lines at the correct line boundary and returns the resulting cursor position

#### Scenario: Empty register paste is safe

- **WHEN** caller pastes an empty or missing register
- **THEN** the prompt buffer module returns a no-op edit result

### Requirement: Prompt buffer operation behavior is covered by focused tests

The implementation SHALL validate prompt buffer operation behavior with focused unit tests covering navigation, visual operations, linewise operations, operator-motion operations, and paste.

#### Scenario: Buffer operation tests run

- **WHEN** the project validation suite runs
- **THEN** buffer operation tests cover the operation-level APIs without depending on Pi runtime objects

