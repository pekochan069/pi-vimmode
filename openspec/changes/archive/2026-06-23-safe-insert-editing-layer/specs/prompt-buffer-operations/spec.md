## ADDED Requirements

### Requirement: Prompt buffer exposes insert-safe movement operations

The prompt buffer module SHALL expose pure prompt-local movement helpers for insert-mode word and line-boundary actions without requiring modal callers to compose raw offsets.

#### Scenario: Insert word movement uses small-word semantics

- **WHEN** caller requests insert word movement backward or forward from a normalized or out-of-bounds cursor
- **THEN** the prompt buffer clamps the cursor, resolves the target with existing lowercase small-word semantics, and returns a safe cursor position without changing prompt text

#### Scenario: Insert line-boundary movement resolves current line

- **WHEN** caller requests insert movement to current line start or current line end
- **THEN** the prompt buffer returns column `0` or the current line length for the clamped cursor line without changing prompt text

#### Scenario: Insert movement no-ops at prompt boundaries

- **WHEN** caller requests insert movement beyond prompt start, prompt end, line start, or line end
- **THEN** the prompt buffer returns a safe no-op cursor position and does not corrupt prompt text

### Requirement: Prompt buffer exposes insert-safe delete operations

The prompt buffer module SHALL expose prompt-local insert delete helpers that edit text without returning or writing Vim registers.

#### Scenario: Insert word-backward delete uses small-word target

- **WHEN** caller requests insert delete-word-backward from a cursor after prompt text
- **THEN** the prompt buffer deletes from the existing small-word backward target to the cursor and returns an `EditResult` without `register`

#### Scenario: Insert word-forward delete uses small-word target

- **WHEN** caller requests insert delete-word-forward from a cursor before prompt text
- **THEN** the prompt buffer deletes from the cursor to the existing small-word forward target and returns an `EditResult` without `register`

#### Scenario: Insert line-backward delete stays on current line

- **WHEN** caller requests insert delete-line-backward from a cursor after the current line start
- **THEN** the prompt buffer deletes from the cursor back to column `0` of the current line, never joins with the previous line, and returns an `EditResult` without `register`

#### Scenario: Insert line-forward delete removes text to line end

- **WHEN** caller requests insert delete-line-forward from a cursor before current line end
- **THEN** the prompt buffer deletes from the cursor to current line end and returns an `EditResult` without `register`

#### Scenario: Insert line-forward at EOL deletes exactly one newline

- **WHEN** caller requests insert delete-line-forward at current line end and another prompt line follows
- **THEN** the prompt buffer deletes exactly the newline between the lines, joins them without trimming spaces, and returns an `EditResult` without `register`

#### Scenario: Insert delete no-ops at prompt boundaries

- **WHEN** caller requests insert delete-word-backward at prompt start, delete-word-forward at prompt end, delete-line-backward at line start, or delete-line-forward at final line end
- **THEN** the prompt buffer returns a safe unchanged `EditResult` without `register`
