## ADDED Requirements

### Requirement: Backward search entry participates in semantic keymap configuration

The Vim keymap configuration SHALL expose backward prompt search entry as a finite semantic command while preserving the default `?` binding.

#### Scenario: Default backward search keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode
- **THEN** pressing `?` enters backward prompt search workbench mode

#### Scenario: Configured backward search key is used

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` is set to a valid key sequence and the editor is in normal mode
- **THEN** that key sequence enters backward prompt search workbench mode instead of requiring the default `?` key

#### Scenario: Configured backward search works from visual modes

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` is set to a valid key sequence and the editor is in a visual mode with an active selection
- **THEN** that key sequence enters backward prompt search workbench mode and a completed matching search extends the active visual selection

#### Scenario: Configured backward search works after operators

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` is set to a valid key sequence and the editor has a pending delete, change, or yank operator
- **THEN** that key sequence starts backward search as an operator motion target

#### Scenario: Insert mode remains Pi-owned for backward search key

- **WHEN** the editor is in insert mode and the user presses `?` or a configured backward search key
- **THEN** input delegates to Pi default editor behavior unless that insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Invalid backward search binding falls back safely

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

#### Scenario: Backward search configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that include `commands.startSearchBackward`
- **THEN** the editor uses the resolved backward search binding without dropping other command, motion, operator, macro, mark, search, UI, or prompt-transform options

### Requirement: Workbench history controls remain finite and non-recursive

The Vim keymap configuration SHALL NOT introduce recursive mappings, timeout behavior, or Pi-owned shortcut capture for workbench history navigation.

#### Scenario: Workbench history controls are active only while workbench input is pending

- **WHEN** the user presses a resolved workbench history navigation key while no search or Ex workbench input is pending
- **THEN** the key follows the existing normal, visual, insert, or Pi-delegated behavior for the current mode

#### Scenario: Protected shortcuts remain protected outside explicit ownership

- **WHEN** `piVimMode.keymap` attempts to bind a protected Pi shortcut that pi-vimmode does not explicitly own for normal-mode Vim behavior
- **THEN** the binding is ignored or rejected with a warning and that shortcut continues to delegate to Pi behavior

#### Scenario: Regex mode syntax is not a keymap action

- **WHEN** the user configures keymap commands, motions, operators, macros, marks, or text objects
- **THEN** regex opt-in remains controlled by the documented search prefix and Ex substitution flag rather than recursive or expression-based key mappings

### Requirement: Backward search keymap documentation is updated and validated

The change SHALL include tests and settings documentation for configurable backward search behavior and finite workbench controls.

#### Scenario: Config validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default backward search keymap resolution, configured backward search command execution, visual/operator contexts, invalid binding fallback, live editor option propagation, and protected shortcut handling

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: Settings reference documents backward search command

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.commands.startSearchBackward`, the default `?` binding, insert-mode delegation, and finite non-recursive workbench history behavior
