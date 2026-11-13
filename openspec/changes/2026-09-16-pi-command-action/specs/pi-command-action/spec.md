## ADDED Requirements

### Requirement: Pi command action bindings are finite and Normal-mode only

The Vim editor SHALL expose `pi.command` and `pi.commandPrompt` as bindable actions with one required `command` argument and Normal-mode support.

#### Scenario: JSON command binding is accepted

- **WHEN** settings configure `piVimMode.keymap.actions` with
  `{ "pi.command": [{ "key": "<leader>t", "args": { "command": "/tree" } }] }`
- **THEN** the resolved keymap accepts that Normal-mode action binding

#### Scenario: JSON prompt-command binding is accepted

- **WHEN** settings configure `piVimMode.keymap.actions` with
  `{ "pi.commandPrompt": [{ "key": "<leader>a", "args": { "command": "/command" } }] }`
- **THEN** the resolved keymap accepts that Normal-mode action binding

#### Scenario: malformed command argument is rejected

- **WHEN** a Pi command action argument is missing, empty, does not begin with `/`, contains a newline, or contains an unknown argument key
- **THEN** that binding is ignored with a warning and valid sibling bindings remain usable

#### Scenario: trusted JavaScript factory is Normal-mode only

- **WHEN** trusted configuration maps `vim.action.pi.command({ command: "/tree" })` or `vim.action.pi.commandPrompt({ command: "/command" })` in Normal mode
- **THEN** the mapping is accepted
- **WHEN** it maps either descriptor in an Insert or Visual scope
- **THEN** the mapping is rejected with the standard unsupported-scope warning

### Requirement: Pi command action dispatch preserves the draft

The Vim editor SHALL submit the configured `pi.command` slash command through the Pi editor submit callback and restore the active draft afterward.

#### Scenario: command dispatch restores draft state

- **WHEN** Normal-mode input resolves a `pi.command` binding while a draft and cursor are present
- **THEN** the adapter submits the configured command and restores draft text, cursor, collapsed paste payloads, extension redo state, and only host undo entries added by dispatch

#### Scenario: command dispatch failure restores draft state

- **WHEN** the Pi submit callback throws or returns a rejecting thenable while dispatching a configured command
- **THEN** the adapter restores the draft state and records a runtime error

#### Scenario: asynchronous submit clears the draft

- **WHEN** a thenable submit route clears the buffer after its asynchronous boundary
- **THEN** the adapter restores that dispatch's draft after settlement when the buffer is empty

#### Scenario: concurrent command dispatch is rejected

- **WHEN** a `pi.command` submit thenable remains pending and another `pi.command` binding triggers
- **THEN** the second trigger does not submit or mutate the draft and reports `Pi command already running`

#### Scenario: settled command allows another dispatch

- **WHEN** a pending command submit resolves or rejects
- **THEN** a later `pi.command` binding may submit normally

#### Scenario: submit callback is unavailable

- **WHEN** a configured command resolves while the editor has no submit callback
- **THEN** the draft remains unchanged and the editor reports that Pi command dispatch is unavailable

#### Scenario: command names are not prevalidated

- **WHEN** a syntactically valid configured slash command is unknown to Pi
- **THEN** pi-vimmode submits it without querying or mirroring Pi command metadata

### Requirement: Pi prompt-command action is a cancellable temporary draft

The Vim editor SHALL prepare `pi.commandPrompt` as a temporary editable slash-command draft and restore the original draft after cancel or submit.

#### Scenario: prompt command prepares editable arguments

- **WHEN** Normal-mode input resolves a `pi.commandPrompt` binding
- **THEN** the editor snapshots the active draft state, replaces the draft with the configured command plus one trailing space, places the cursor at the end, and enters Insert mode

#### Scenario: Escape cancels the temporary command

- **WHEN** the temporary prompt command is active and the user presses Escape without Pi autocomplete open
- **THEN** the editor restores the original draft text, cursor, extension redo state, and dispatch-created host undo entries without submitting

#### Scenario: autocomplete Escape stays native first

- **WHEN** the temporary prompt command is active while Pi autocomplete is open and the user presses Escape
- **THEN** Pi handles that Escape to close autocomplete and the temporary command remains active until a later Escape

#### Scenario: prompt command submit restores the original draft

- **WHEN** the user edits the temporary command and presses Enter
- **THEN** the editor submits the edited command through Pi and restores the original draft using the guarded synchronous and asynchronous behavior of `pi.command`
