## ADDED Requirements

### Requirement: Macro recording captures Ex command-line input

The editor SHALL record and replay Ex command-line keystrokes through the existing macro input-token model.

#### Scenario: Record successful Ex substitution

- **WHEN** macro recording is active and the user enters Ex command-line mode, types a valid substitution command, and presses `Enter`
- **THEN** the Ex entry key, command text input, and `Enter` token are stored in the active macro after handling, excluding macro control sequences

#### Scenario: Replay recorded Ex substitution

- **WHEN** a recorded macro contains Ex command-line keystrokes for substitution and the editor replays that macro from normal mode
- **THEN** the replayed inputs enter Ex command-line mode and execute the substitution against the current prompt state using the same semantics as live input

#### Scenario: Record cancelled Ex command-line input

- **WHEN** macro recording is active and the user enters Ex command-line mode, types command text, and presses `Esc`
- **THEN** the recorded macro includes the Ex input and cancellation tokens so replay cancels without editing prompt text

#### Scenario: Replay Ex error does not stop macro token processing

- **WHEN** a replayed macro executes an Ex command that reports an Ex error
- **THEN** prompt text remains unchanged for that Ex command and subsequent recorded macro tokens continue through the existing macro replay path
