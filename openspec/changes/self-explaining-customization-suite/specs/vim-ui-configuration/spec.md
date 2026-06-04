## ADDED Requirements

### Requirement: Runtime informational messages are width-safe

The Vim editor SHALL render diagnostic and optional feedback messages in the existing bounded message row without overflowing the editor viewport.

#### Scenario: Diagnostic message renders below prompt

- **WHEN** a diagnostic command such as `:vimdoctor`, `:keymap`, `:mapcheck`, or `:actions` completes with a message
- **THEN** the rendered editor includes one width-safe row below the prompt box showing the diagnostic message

#### Scenario: Diagnostic message shrinks prompt viewport

- **WHEN** a diagnostic or feedback message row is visible
- **THEN** the prompt editor viewport uses one fewer terminal row so total rendering remains bounded

#### Scenario: Long diagnostic message is fitted

- **WHEN** a diagnostic or feedback message is longer than the available terminal width
- **THEN** the rendered row is truncated or fitted according to existing width-safety behavior without corrupting prompt text rendering

### Requirement: Transient messages support info feedback

The Vim editor SHALL support informational transient messages in addition to existing Ex success and error messages.

#### Scenario: Info message clears on next handled input

- **WHEN** an informational diagnostic or no-op feedback message is visible and the user provides the next handled input
- **THEN** the informational message clears using the same transient lifecycle as existing Ex messages

#### Scenario: Existing Ex success and error messages remain supported

- **WHEN** an existing editing Ex command succeeds or fails
- **THEN** the editor continues to show the existing success or error message behavior without requiring no-op feedback to be enabled

#### Scenario: Message kind does not alter prompt editing state

- **WHEN** a success, error, or info message is displayed
- **THEN** the message kind affects only the transient message content and does not itself edit prompt text, registers, marks, macros, search state, or visual selection

### Requirement: No-op feedback is configurable

The Vim editor SHALL expose optional no-op feedback settings without changing the quiet default user interface.

#### Scenario: Feedback disabled preserves quiet no-ops

- **WHEN** no-op feedback is disabled and a normal-mode input is safely ignored
- **THEN** the editor does not render a new informational feedback message

#### Scenario: Feedback enabled shows bounded explanation

- **WHEN** no-op feedback is enabled and a confusing no-op occurs, such as an invalid pending operator or protected shortcut delegation
- **THEN** the editor shows one transient explanatory message in the bounded message row

#### Scenario: Invalid feedback setting falls back safely

- **WHEN** the no-op feedback setting has an unsupported type or value
- **THEN** settings resolution records a warning, ignores the invalid field, preserves valid sibling fields, and the editor uses the default quiet feedback behavior
