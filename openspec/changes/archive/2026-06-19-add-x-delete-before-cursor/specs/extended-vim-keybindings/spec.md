## ADDED Requirements

### Requirement: Normal mode supports delete before cursor

The Vim editor SHALL support `X` in normal mode as a prompt-local delete-before-cursor command.

#### Scenario: Delete character before cursor

- **WHEN** the editor is in normal mode with the cursor after at least one character on the current line and the user presses `X`
- **THEN** the character immediately before the cursor is deleted, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Counted delete before cursor

- **WHEN** the editor is in normal mode with characters before the cursor and the user presses `3X`
- **THEN** up to three characters immediately before the cursor on the current line are deleted, copied to the unnamed character register in prompt order, and the editor remains in normal mode

#### Scenario: Delete before cursor at line start is safe

- **WHEN** the editor is in normal mode with the cursor at the start of a line and the user presses `X`
- **THEN** prompt text is unchanged, the unnamed register is unchanged, and the editor remains in normal mode

#### Scenario: Delete before cursor does not cross line boundary

- **WHEN** the editor is in normal mode with the cursor near the start of a line and the user presses a count larger than the number of characters before the cursor on that line followed by `X`
- **THEN** only characters before the cursor on the current line are deleted and no previous line text is removed

#### Scenario: Delete before cursor remains distinct from numeric decrement

- **WHEN** the editor is in normal mode and the user presses `X`
- **THEN** the editor runs delete-before-cursor behavior instead of `Ctrl+X` numeric decrement behavior

### Requirement: Delete-before-cursor behavior is documented and validated

The implementation SHALL include focused tests and user-facing documentation for `X`.

#### Scenario: Automated validation covers delete before cursor

- **WHEN** `bun test` is executed
- **THEN** tests cover normal, counted, line-start no-op, register, and dot-repeat behavior for `X`

#### Scenario: Feature guide documents delete before cursor

- **WHEN** the user opens `docs/features.md`
- **THEN** the normal-mode keymap documents `X` as delete character before cursor
