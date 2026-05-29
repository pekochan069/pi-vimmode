# vim-macro-recording Specification

## Purpose

TBD - created by archiving change add-macro-recording-playback. Update Purpose after archive.
## Requirements
### Requirement: Macro recording uses a normal-mode lifecycle

The editor SHALL support extension-local macro recording from normal mode using lowercase `a` through `z` macro slots.

#### Scenario: Start recording a macro slot

- **WHEN** the editor is in normal mode and receives `q` followed by valid slot key `a`
- **THEN** it starts recording macro slot `a`, leaves prompt text/cursor/mode unchanged, and does not store the `qa` control sequence in the macro

#### Scenario: Stop recording a macro

- **WHEN** macro recording is active and the editor is in normal mode and receives `q`
- **THEN** it stops recording and does not append the stopping `q` to the stored macro

#### Scenario: Insert-mode q is recorded as text

- **WHEN** macro recording is active, the editor is in insert mode, and the user types `q`
- **THEN** `q` is handled as insert-mode text and is appended to the active macro rather than stopping recording

#### Scenario: Invalid recording target is ignored

- **WHEN** the editor is in normal mode and receives `q` followed by a key that is not a valid macro slot
- **THEN** it clears the macro-recording pending state, does not start recording, and leaves prompt text unchanged

### Requirement: Macro recording captures replayable Vim-mode input

The editor SHALL append replayable Vim-mode input tokens to the active macro in order after they are handled, and MUST exclude macro control sequences and Pi-delegated application shortcuts.

#### Scenario: Record normal-mode command input

- **WHEN** macro recording is active and a normal-mode command edits the prompt
- **THEN** the command input is stored in the active macro after the edit is applied

#### Scenario: Record insert-mode text and escape

- **WHEN** macro recording is active and the user enters insert mode, types text, and exits insert mode with `Esc`
- **THEN** the insert command, typed text tokens, and handled `Esc` are stored in order for later replay

#### Scenario: Exclude Pi-delegated shortcut input

- **WHEN** macro recording is active and an input is delegated to Pi application behavior instead of handled by Vim mode
- **THEN** the delegated input is not appended to the active macro

#### Scenario: Macro storage remains separate from unnamed register

- **WHEN** macro recording starts, stops, or stores input tokens
- **THEN** the unnamed yank/delete register remains unchanged unless a recorded edit command itself updates the register

### Requirement: Macro playback reuses current modal semantics

The editor SHALL replay stored macro input tokens through the same Vim-mode input handling path used for live input.

#### Scenario: Play recorded macro slot

- **WHEN** the editor is in normal mode and receives `@a` for a macro slot containing recorded input
- **THEN** it replays the stored input against the current prompt state and applies the same edits, cursor movements, mode transitions, and register updates as live input would

#### Scenario: Missing macro slot is a no-op

- **WHEN** the editor is in normal mode and receives `@a` for an empty or missing macro slot
- **THEN** prompt text, cursor, mode, and registers remain unchanged

#### Scenario: Repeat last played macro

- **WHEN** macro slot `a` has been successfully played and the editor later receives `@@` in normal mode
- **THEN** it replays macro slot `a` again against the current prompt state

#### Scenario: Repeat before any playback is a no-op

- **WHEN** the editor is in normal mode and receives `@@` before any macro slot has been successfully played
- **THEN** prompt text, cursor, mode, and registers remain unchanged

### Requirement: Macro playback is non-recursive and recording-safe

The editor SHALL guard macro playback so macros cannot recursively trigger nested playback and SHALL NOT replay macros while a recording is active.

#### Scenario: Playback command inside replay is ignored

- **WHEN** a replayed macro contains `@a` or `@@`
- **THEN** the nested playback command is ignored and does not start another replay loop

#### Scenario: Playback while recording is ignored

- **WHEN** macro recording is active and the user enters `@a` or `@@` from normal mode
- **THEN** the editor does not replay a macro and does not append the playback control sequence to the active recording

### Requirement: Macro controls and behavior are configurable

The editor SHALL allow users to configure macro control keys and macro behavior while preserving Vim-compatible defaults.

#### Scenario: Configure macro record and play keys

- **WHEN** `piVimMode.keymap.macros.record` is configured to `m` and `piVimMode.keymap.macros.play` is configured to `r`
- **THEN** normal-mode `m{slot}` starts/stops recording and `r{slot}` / `rr` plays macros instead of the default `q` / `@` controls

#### Scenario: Disable macros

- **WHEN** `piVimMode.macros.enabled` is `false`
- **THEN** macro recording and playback controls are ignored as macro controls

#### Scenario: Restrict macro slots

- **WHEN** `piVimMode.macros.slots` is configured to `["x"]`
- **THEN** only macro slot `x` can be recorded or played and other slot targets are ignored as invalid macro targets

#### Scenario: Cap macro replay steps

- **WHEN** `piVimMode.macros.maxReplaySteps` is configured
- **THEN** macro playback replays at most that many stored input tokens for one invocation

### Requirement: Macro recording feedback is visible and documented

The editor SHALL expose active macro recording state through Vim status feedback and SHALL document supported macro behavior, configuration, and limitations.

#### Scenario: Recording status is shown

- **WHEN** status UI is enabled and macro recording is active for slot `a`
- **THEN** the rendered status includes a width-safe recording indicator for slot `a`

#### Scenario: README documents macro support

- **WHEN** the user opens the project README
- **THEN** it documents `q{slot}`, normal-mode `q` stop, `@{slot}`, `@@`, macro configuration, supported slot scope, and limitations around named registers, delegated shortcuts, recursion, and persistence

#### Scenario: Macro validation runs

- **WHEN** project validation is executed
- **THEN** automated tests cover macro parsing, recording, playback, repeat-last playback, configuration, recording feedback, guard behavior, and TypeScript type checking

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

