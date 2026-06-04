## ADDED Requirements

### Requirement: Redo command participates in semantic keymap configuration

The Vim editor SHALL expose redo as a finite semantic command in `piVimMode.keymap.commands` while preserving the default Vim redo binding.

#### Scenario: Default redo keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode with redo state available
- **THEN** pressing `Ctrl+R` invokes redo

#### Scenario: Configured redo command is used

- **WHEN** `piVimMode.keymap.commands.redo` is set to a valid key sequence and the editor is in normal mode with redo state available
- **THEN** pressing that configured key sequence invokes redo instead of requiring the default `Ctrl+R` key

#### Scenario: Invalid redo binding falls back safely

- **WHEN** `piVimMode.keymap.commands.redo` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

#### Scenario: Redo configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that include `commands.redo`
- **THEN** the editor uses the resolved redo binding without dropping other command, motion, operator, macro, mark, search, or UI options

### Requirement: Explicit control-key ownership includes normal-mode redo

The Vim keymap configuration SHALL continue protecting Pi-owned shortcuts while allowing the extension to explicitly own `Ctrl+R` for normal-mode redo.

#### Scenario: Normal mode redo control is handled by Vim mode

- **WHEN** the editor is in normal mode and the user presses `Ctrl+R` with default keymap settings
- **THEN** the Vim editor treats the input as redo rather than delegating it to Pi

#### Scenario: Insert mode remains Pi-owned for redo control

- **WHEN** the editor is in insert mode and the user presses `Ctrl+R`
- **THEN** input delegates to Pi default editor behavior unless insert-mode `Ctrl+R` is explicitly supported by pi-vimmode in a future change

#### Scenario: Other protected shortcuts remain protected

- **WHEN** `piVimMode.keymap` attempts to bind a protected Pi shortcut that pi-vimmode does not explicitly own
- **THEN** the binding is ignored or rejected with a warning and that shortcut continues to delegate to Pi behavior

### Requirement: Redo keymap documentation is updated and validated

The change SHALL include tests and settings documentation for configurable redo behavior and shortcut ownership.

#### Scenario: Config validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default redo keymap resolution, configured redo command execution, invalid redo binding fallback, live editor option propagation, and protected shortcut handling

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: Settings reference documents redo command

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.commands.redo`, the default `ctrl+r` binding, and normal-mode shortcut ownership
