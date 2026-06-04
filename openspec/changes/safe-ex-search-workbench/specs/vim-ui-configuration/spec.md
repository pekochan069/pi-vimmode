## ADDED Requirements

### Requirement: Shared workbench row renders search and Ex input width-safely

The Vim editor SHALL render pending `/`, `?`, and `:` workbench input in a dedicated width-safe row that composes with the prompt viewport and existing Vim UI.

#### Scenario: Forward search workbench row is visible

- **WHEN** forward search input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the `/` prefix and current pending search text without inserting that text into the prompt buffer

#### Scenario: Backward search workbench row is visible

- **WHEN** backward search input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the `?` prefix and current pending search text without inserting that text into the prompt buffer

#### Scenario: Ex workbench row remains visible

- **WHEN** Ex command-line input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the `:` prefix and current pending Ex command text

#### Scenario: Workbench row shrinks prompt viewport

- **WHEN** a search or Ex workbench row is visible for active input, preview, success, or error messaging
- **THEN** the prompt editor viewport uses one fewer terminal row so total rendering remains bounded

#### Scenario: Long workbench text is truncated safely

- **WHEN** pending workbench text is longer than the available terminal width
- **THEN** the workbench row truncates or scrolls the displayed text without emitting lines wider than the terminal width

### Requirement: Workbench messages render preview, success, and error states safely

The Vim editor SHALL render workbench feedback for search errors, Ex errors, Ex success counts, and substitution previews without breaking visual selection, search highlights, or cursor rendering.

#### Scenario: Substitution preview message is visible

- **WHEN** a substitution preview is active
- **THEN** the workbench row shows a readable substitution count and guidance that `Enter` applies while `Esc` cancels

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

The change SHALL include automated rendering tests and user-facing documentation for shared workbench display behavior.

#### Scenario: Render validation runs

- **WHEN** `bun test` is executed
- **THEN** render tests cover `/`, `?`, and `:` workbench rows, long pending text, substitution preview messages, transient regex errors, viewport shrink behavior, visual selection composition, search highlight composition, and narrow terminal widths

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: User docs describe workbench row

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents where `/`, `?`, `:` workbench input, substitution previews, counts, and errors appear and how those rows affect prompt viewport height
