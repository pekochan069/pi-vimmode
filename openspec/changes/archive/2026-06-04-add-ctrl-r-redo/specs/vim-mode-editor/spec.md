## ADDED Requirements

### Requirement: Normal mode supports redo after undo

The Vim editor SHALL support normal-mode redo for the most recent prompt text/cursor state undone by normal-mode undo, without changing extension-local registers, marks, macro state, or dot-repeat state.

#### Scenario: Redo restores the most recent undone prompt edit

- **WHEN** the editor is in normal mode after `u` successfully undoes a prompt text edit and the user presses `Ctrl+R`
- **THEN** the editor restores the text and cursor state from before that undo and remains in normal mode

#### Scenario: Redo without an undone edit is safe

- **WHEN** the editor is in normal mode with no redo state available and the user presses `Ctrl+R`
- **THEN** prompt text, cursor position, registers, marks, dot-repeat state, and mode remain unchanged

#### Scenario: New text edit clears redo branch

- **WHEN** the editor is in normal mode after `u` creates redo state and the user performs another successful text-changing edit before pressing `Ctrl+R`
- **THEN** `Ctrl+R` does not restore the stale undone branch and the current prompt text remains unchanged by redo

#### Scenario: Movement before redo preserves redo state

- **WHEN** the editor is in normal mode after `u` creates redo state and the user moves the cursor without changing prompt text before pressing `Ctrl+R`
- **THEN** redo remains available and restores the undone prompt text state

#### Scenario: Insert mode remains delegated

- **WHEN** the editor is in insert mode and the user presses `Ctrl+R`
- **THEN** the key is delegated to Pi's default editor behavior unless pi-vimmode explicitly supports insert-mode `Ctrl+R` in a future change

### Requirement: Redo behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for redo behavior and current limitations.

#### Scenario: Automated validation covers redo

- **WHEN** `bun test` is executed
- **THEN** tests cover redo after undo, redo without state, redo branch clearing after new edits, movement before redo, insert-mode delegation, and existing undo behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents redo

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents normal-mode `Ctrl+R` redo, redo limitations, and the fact that pi-vimmode does not implement a Vim undo tree
