## ADDED Requirements

### Requirement: Normal mode supports case operators

The Vim editor SHALL support finite prompt-local case operators for lowercasing, uppercasing, and toggling case across supported normal-mode ranges.

#### Scenario: Lowercase by motion

- **WHEN** the editor is in normal mode with mixed-case text under the cursor and the user presses `guw`
- **THEN** the addressed word range is lowercased, the editor remains in normal mode, and unnamed and named registers are unchanged

#### Scenario: Uppercase text object

- **WHEN** the editor is in normal mode with the cursor inside a word and the user presses `gUiw`
- **THEN** the inner word text object is uppercased, the editor remains in normal mode, and registers are unchanged

#### Scenario: Toggle current line

- **WHEN** the editor is in normal mode and the user presses `g~g~`
- **THEN** the current prompt line has letter case toggled, the editor remains in normal mode, and registers are unchanged

#### Scenario: Counted case operator applies to finite target

- **WHEN** the editor is in normal mode and the user presses `2guw` with two word ranges available
- **THEN** the addressed finite range is lowercased and the cursor is restored to the start of the changed range

#### Scenario: Missing case target is safe

- **WHEN** the editor is in normal mode with a pending case operator and the requested motion or text object target does not exist
- **THEN** prompt text, cursor position, registers, and mode are unchanged, and pending operator state clears

#### Scenario: Case operator is repeatable

- **WHEN** a normal-mode case operator changes prompt text and the user later presses `.` in normal mode at another valid target
- **THEN** the same case operator target is applied at the new cursor position

### Requirement: Visual modes support selected case transforms

The Vim editor SHALL support prompt-local lower, upper, and toggle case transforms for active visual selections.

#### Scenario: Visual character selection lowercases selected text

- **WHEN** the editor is in visual character mode with selected mixed-case text and the user presses `u`
- **THEN** only the selected character range is lowercased, visual selection clears, the editor returns to normal mode, and registers are unchanged

#### Scenario: Visual line selection uppercases selected lines

- **WHEN** the editor is in visual line mode with one or more selected lines and the user presses `U`
- **THEN** all selected lines are uppercased, visual selection clears, the editor returns to normal mode, and registers are unchanged

#### Scenario: Visual block selection toggles selected cells

- **WHEN** the editor is in visual block mode with a rectangular selection and the user presses `~`
- **THEN** only selected block cells have letter case toggled, visual selection clears, the editor returns to normal mode, and registers are unchanged

#### Scenario: Non-letter and expanding case mappings stay safe

- **WHEN** a case transform range includes non-letter characters or characters whose JavaScript case mapping expands to multiple code points
- **THEN** those characters remain width-safe and prompt text outside one-code-point case mappings is unchanged

### Requirement: Case operators are documented and validated

The implementation SHALL include automated validation and user-facing documentation for normal and visual case transforms.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover normal case operators, motion targets, text-object targets, line targets, counts, visual character/line/block transforms, safe no-op behavior, register preservation, dot-repeat, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents case behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `gu`, `gU`, `g~`, visual `u` / `U` / `~`, supported targets, register behavior, repeat behavior, and non-goals compared with full Vim case grammar
