# prompt-transform-action-keybindings Specification

## Purpose
TBD - created by archiving change typed-action-registry-keybindings. Update Purpose after archive.
## Requirements
### Requirement: Prompt transform actions have canonical registry metadata

The Vim editor SHALL expose a finite typed registry for bindable prompt transform actions using canonical `prompt.transform.*` action IDs.

#### Scenario: Registry contains first milestone transform actions

- **WHEN** the action registry is inspected by config, diagnostics, or tests
- **THEN** it includes canonical entries for quote, unquote, bulletize, fence, indent, dedent, and reflow prompt transforms

#### Scenario: Registry excludes metadata-only diagnostics from bindable actions

- **WHEN** `piVimMode.keymap.actions` is parsed
- **THEN** only bindable prompt transform action IDs are accepted and metadata-only diagnostic IDs such as `vimmode.doctor` are rejected with a warning

#### Scenario: Action IDs are unique

- **WHEN** the registry is validated
- **THEN** no two action entries share the same canonical action ID

### Requirement: Action keybindings resolve through modal grammar

The Vim editor SHALL resolve action keybindings through the same finite normal/visual modal grammar as existing configured commands.

#### Scenario: Normal action key resolves

- **WHEN** `prompt.transform.reflow` is bound to `gq` and the editor is in normal mode
- **THEN** pressing `gq` resolves to a prompt transform action result rather than inserting text or starting a separate resolver path

#### Scenario: Counted action key resolves

- **WHEN** `prompt.transform.quote` is bound to `g>` and the user presses `3g>` in normal mode
- **THEN** the action result includes a count of 3 and targets the current line through the next two prompt lines

#### Scenario: Prefix action key waits deterministically

- **WHEN** an action keybinding uses a multi-key sequence such as `gq`
- **THEN** pressing `g` enters pending state and does not execute the action until the full sequence is received

#### Scenario: Invalid pending action sequence clears safely

- **WHEN** the editor has a pending action sequence prefix and the next key completes no grammar or action binding
- **THEN** pending state clears, prompt text remains unchanged, and insert-mode text is not produced

#### Scenario: Action keybinding is not an operator target

- **WHEN** an operator is pending and the next keys would match an action keybinding if no operator were pending
- **THEN** the action does not execute as a motion or text object target and prompt text remains unchanged

#### Scenario: Action keybinding is not register-addressed

- **WHEN** a register prefix is pending and the next keys would match an action keybinding if no register prefix were pending
- **THEN** the action does not execute, registers remain unchanged, and prompt text remains unchanged

### Requirement: Keybound prompt transforms preserve modal side effects

Keybound prompt transform actions SHALL edit prompt text only through existing prompt transform edit behavior and SHALL preserve unrelated modal state.

#### Scenario: Action transform is not dot-repeatable in first milestone

- **WHEN** a keybound prompt transform edits text and the user presses `.` afterward
- **THEN** the action transform is not replayed by dot-repeat in the first milestone

#### Scenario: Action transform preserves registers and marks

- **WHEN** a keybound prompt transform edits a prompt range
- **THEN** registers and marks are not modified except for existing cursor clamping caused by the text edit

#### Scenario: Macro records and replays action keys

- **WHEN** macro recording is active and the user invokes an accepted action keybinding
- **THEN** the macro records the key sequence input and replay resolves that key sequence through the current keymap

#### Scenario: Changed action transform clears visible search highlights

- **WHEN** a keybound prompt transform changes prompt text while prompt search highlights are visible
- **THEN** visible prompt search highlights clear and repeat-search history remains available for `n` and `N`

#### Scenario: Successful action transform is silent

- **WHEN** a keybound prompt transform successfully changes prompt text
- **THEN** no retained success message is added and diagnostics message history is unchanged by the success

#### Scenario: Unchanged action transform reports no-op feedback

- **WHEN** a keybound prompt transform applies successfully but produces no text change
- **THEN** prompt text remains unchanged and no-op feedback follows the resolved feedback settings

#### Scenario: Failed action transform reports error

- **WHEN** a keybound prompt transform cannot apply to the target range
- **THEN** prompt text remains unchanged and a runtime error message is shown

#### Scenario: Insert mode remains Pi-owned

- **WHEN** the editor is in insert mode and a key sequence matches a configured action binding
- **THEN** input delegates to Pi/default insert behavior rather than invoking the action

