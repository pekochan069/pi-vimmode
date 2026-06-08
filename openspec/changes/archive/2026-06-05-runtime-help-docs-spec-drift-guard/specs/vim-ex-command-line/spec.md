## ADDED Requirements

### Requirement: Ex command-line supports finite runtime help commands

The Vim editor SHALL parse and execute finite read-only runtime help commands from Ex command-line mode.

#### Scenario: Help command executes

- **WHEN** the editor executes `:help` or `:help search`
- **THEN** the editor exits Ex command-line mode and shows a bounded informational message for the requested help entry

#### Scenario: Features command executes

- **WHEN** the editor executes `:features` or `:features redo`
- **THEN** the editor exits Ex command-line mode and shows a bounded informational message for the requested feature list or feature match

#### Scenario: Messages command executes

- **WHEN** the editor executes `:messages`
- **THEN** the editor exits Ex command-line mode and shows a bounded informational message describing retained runtime messages

#### Scenario: Unsupported runtime help abbreviation is rejected

- **WHEN** the editor executes an unsupported abbreviation such as `:h`, `:feat`, or `:mes`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

#### Scenario: Unexpected messages arguments are rejected

- **WHEN** the editor executes `:messages noisy` or another `:messages` command with unsupported trailing arguments
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

### Requirement: Runtime help Ex commands are read-only

Runtime help Ex commands SHALL not edit the prompt buffer or mutate modal editing side effects beyond the bounded informational message.

#### Scenario: Runtime help command preserves normal-mode state

- **WHEN** the editor executes `:help`, `:features`, or `:messages` from normal Ex command-line mode
- **THEN** prompt text, cursor position, registers, marks, search highlights, macro state, and dot-repeat state remain unchanged except for the transient informational message

#### Scenario: Runtime help command preserves visual Ex state

- **WHEN** Ex command-line mode was opened from a visual selection, the user deletes the prefilled visual range marker, and executes `:help`, `:features`, or `:messages`
- **THEN** the command exits Ex mode without editing prompt text and restores the original visual mode, anchor, cursor, and highlight according to existing visual Ex restoration behavior

#### Scenario: Runtime help command does not update dot repeat

- **WHEN** the editor executes `:help`, `:features`, or `:messages` after a repeatable normal-mode edit
- **THEN** pressing `.` later repeats the previous supported normal-mode edit rather than replaying the runtime help command
