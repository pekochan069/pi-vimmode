## MODIFIED Requirements

### Requirement: Normal mode repeats completed changes

The Vim editor SHALL support `.` to repeat the last completed supported change command at the current cursor position, including documented line edit commands that changed the prompt.

#### Scenario: Repeat character replacement

- **WHEN** the editor is in normal mode after a successful `rx` change and the user moves to another character and presses `.`
- **THEN** the character under the cursor is replaced with `x`

#### Scenario: Repeat substitution

- **WHEN** the editor is in normal mode after a successful supported substitution and the user presses `.` at another valid location
- **THEN** the same substitution command is applied at the new location

#### Scenario: Repeat line delete

- **WHEN** the editor is in normal mode after a successful `dd` or counted `dd` change and the user presses `.` at another valid line
- **THEN** the same line delete command is applied at the new location and updates the unnamed line register

#### Scenario: Repeat line change

- **WHEN** the editor is in normal mode after a successful `cc` or `S` change returns to normal mode and the user presses `.` at another valid line
- **THEN** the same line change command is applied at the new location and the editor enters insert mode

#### Scenario: Repeat with no prior change is safe

- **WHEN** the editor is in normal mode and no repeatable change has completed
- **THEN** pressing `.` leaves prompt text, cursor position, registers, and mode unchanged

#### Scenario: Unsupported prior action is not repeated

- **WHEN** the most recent handled action is not a supported repeatable change
- **THEN** pressing `.` leaves prompt text, cursor position, registers, and mode unchanged

### Requirement: Roadmap keybindings are documented and validated

The change SHALL include automated tests and user-facing documentation for the new staged keybinding groups and SHALL keep README limitations aligned with supported keybinding behavior.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover counts, numeric adjustment, word-end motion, replacement, substitution, line-local character search, dot-repeat, text objects, safe no-op behavior, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: README documents roadmap keybindings

- **WHEN** the user opens the project README
- **THEN** it documents the newly supported keybindings, count behavior, repeat limitations, supported text objects, and deferred keybindings such as `/`, `?`, `n`, and `N`

#### Scenario: README limitations do not contradict supported keybindings

- **WHEN** the user reads README limitations
- **THEN** the limitations do not list counts, text objects, line-local character search, or other supported roadmap keybindings as unsupported
