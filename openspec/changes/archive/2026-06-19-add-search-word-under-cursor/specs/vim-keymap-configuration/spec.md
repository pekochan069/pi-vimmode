## ADDED Requirements

### Requirement: Word-under-cursor search commands participate in semantic keymap configuration

The Vim keymap configuration SHALL expose word-under-cursor prompt search as finite semantic command actions while preserving the default `*` and `#` bindings.

#### Scenario: Default star keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode with the cursor on a keyword word
- **THEN** pressing `*` searches forward for that word using prompt-local word search behavior

#### Scenario: Default hash keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode with the cursor on a keyword word
- **THEN** pressing `#` searches backward for that word using prompt-local word search behavior

#### Scenario: Configured forward word search key is used

- **WHEN** `piVimMode.keymap.commands.searchWordForward` is set to a valid key sequence and the editor is in normal mode with the cursor on a keyword word
- **THEN** that key sequence searches forward for that word instead of requiring the default `*` key

#### Scenario: Configured backward word search key is used

- **WHEN** `piVimMode.keymap.commands.searchWordBackward` is set to a valid key sequence and the editor is in normal mode with the cursor on a keyword word
- **THEN** that key sequence searches backward for that word instead of requiring the default `#` key

#### Scenario: Insert mode remains Pi-owned for word search keys

- **WHEN** the editor is in insert mode and the user presses `*`, `#`, or a configured word search key
- **THEN** input delegates to Pi default editor behavior unless that insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Invalid word search binding falls back safely

- **WHEN** `piVimMode.keymap.commands.searchWordForward` or `piVimMode.keymap.commands.searchWordBackward` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

#### Scenario: Word search configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that include word search command bindings
- **THEN** the editor uses the resolved word search bindings without dropping other command, motion, operator, macro, mark, search, UI, prompt-structure, prompt-transform, or feedback options

### Requirement: Word search keymap documentation is updated and validated

The change SHALL include tests and settings documentation for configurable word-under-cursor search behavior.

#### Scenario: Config validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default word search keymap resolution, configured word search command execution, invalid binding fallback, live editor option propagation, and insert-mode delegation

#### Scenario: Settings reference documents word search commands

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.commands.searchWordForward`, default `*`, `piVimMode.keymap.commands.searchWordBackward`, default `#`, normal-mode ownership, and insert-mode delegation
