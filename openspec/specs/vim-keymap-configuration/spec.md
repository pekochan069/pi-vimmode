# vim-keymap-configuration Specification

## Purpose

TBD - created by archiving change make-vimmode-configurable. Update Purpose after archive.

## Requirements

### Requirement: Semantic keymap configuration resolves supported Vim actions

The Vim editor SHALL read `piVimMode.keymap` as a semantic mapping for supported operators, motions, and commands while preserving the existing default keymap when no keymap config is provided.

#### Scenario: Default keymap preserved

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds the currently documented normal, visual, operator, motion, paste, open-line, join, and undo commands to their existing default keys

#### Scenario: Operator binding configured

- **WHEN** `piVimMode.keymap.operators.delete` is set to a valid key sequence and the editor is in normal mode
- **THEN** that key sequence starts the delete operator instead of requiring the default `d` key

#### Scenario: Motion binding configured

- **WHEN** `piVimMode.keymap.motions.wordForward` is set to a valid key sequence and the editor is in normal or visual mode
- **THEN** that key sequence performs the configured word-forward motion where word-forward is supported

#### Scenario: Command binding configured

- **WHEN** `piVimMode.keymap.commands.openLineBelow` is set to a valid key sequence and the editor is in normal mode
- **THEN** that key sequence inserts a blank line below the current line and enters insert mode

#### Scenario: Invalid keymap field falls back

- **WHEN** a `piVimMode.keymap` field has an unsupported type, protected key, or invalid action name
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

### Requirement: Operator-motion matrix is configurable

The Vim editor SHALL use `piVimMode.keymap.operatorMotions` to determine which configured motions are valid after each configured operator.

#### Scenario: Configured operator-motion combination executes

- **WHEN** `delete` is bound to a configured operator key and `wordForward` is included in `piVimMode.keymap.operatorMotions.delete`
- **THEN** pressing the delete operator followed by the configured `wordForward` motion deletes that text range and stores it in the unnamed character register

#### Scenario: Configured operator-motion combination is disabled

- **WHEN** a motion action is omitted from `piVimMode.keymap.operatorMotions.change`
- **THEN** pressing the configured change operator followed by that motion clears the pending operator, leaves prompt text unchanged, and does not insert the motion key as text

#### Scenario: Default operator-motion matrix preserved

- **WHEN** no `piVimMode.keymap.operatorMotions` setting is configured
- **THEN** `delete`, `change`, and `yank` support the default `wordForward`, `wordBackward`, `lineStart`, `firstNonBlank`, and `lineEnd` motion actions

### Requirement: Key sequence matching is finite and deterministic

The Vim editor SHALL resolve configured key sequences with a finite matcher that supports single-key and multi-key sequences without recursive mappings or timeout behavior.

#### Scenario: Multi-key sequence resolves

- **WHEN** a supported action is configured with a multi-key sequence such as `gg`
- **THEN** the editor records the first key as a pending prefix and executes the action only after the full sequence is received

#### Scenario: Pending sequence invalidates safely

- **WHEN** the editor has a pending configured sequence prefix and the next printable key does not complete any configured sequence
- **THEN** the pending sequence clears, prompt text remains unchanged, and the unmatched printable key is not inserted

#### Scenario: Conflicting mapping is deterministic

- **WHEN** two actions are configured with the same key sequence in the same mode context
- **THEN** the extension keeps a deterministic resolved action, records a warning for the conflict, and does not fail session startup

### Requirement: Pi-owned shortcuts remain protected

The Vim keymap configuration MUST NOT steal Pi app-owned shortcuts by default.

#### Scenario: Protected key binding ignored

- **WHEN** `piVimMode.keymap` attempts to bind a protected key such as submit, interrupt, external editor, model selection, thinking controls, image paste, or autocomplete control
- **THEN** the binding is ignored or rejected with a warning and the key continues to delegate to Pi behavior

#### Scenario: Insert mode remains Pi-owned

- **WHEN** the editor is in insert mode and the user presses ordinary text input, autocomplete keys, submit, or Pi app shortcuts
- **THEN** input is delegated to Pi's default editor behavior regardless of normal-mode keymap configuration

### Requirement: Keymap configuration is documented and validated

The change SHALL include automated validation and user documentation for keymap configuration.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default keymap resolution, configured operators, configured motions, configured commands, operator-motion matrices, protected keys, invalid config fallback, multi-key sequences, and conflicts

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: README documents keymap config

- **WHEN** the user opens the project README
- **THEN** it documents `piVimMode.keymap`, supported semantic actions, default mappings, protected shortcut behavior, and non-goals such as recursive mappings and full Vimscript support

### Requirement: Roadmap keybindings participate in semantic keymap configuration

The Vim editor SHALL expose newly supported roadmap keybindings through the semantic keymap model when the action can be represented as a finite key sequence or command prefix without recursive mappings or timeout behavior.

#### Scenario: Default roadmap keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds the newly supported roadmap actions to their documented default Vim keys

#### Scenario: Word-end motion can be configured

- **WHEN** `piVimMode.keymap.motions` configures the semantic word-end motion to a valid key sequence
- **THEN** that key sequence performs word-end movement in normal and visual contexts where word-end movement is supported

#### Scenario: Word-end operator motion can be configured

- **WHEN** the semantic word-end motion is included in `piVimMode.keymap.operatorMotions.delete`
- **THEN** the resolved delete operator followed by the configured word-end motion deletes the addressed range

#### Scenario: Roadmap commands can be configured where finite

- **WHEN** `piVimMode.keymap.commands` configures a newly supported finite command or command prefix to a valid key sequence
- **THEN** that key sequence invokes the corresponding command in supported normal-mode contexts

#### Scenario: Text-object operator targets remain deterministic

- **WHEN** a user configures operator, motion, command, macro, mark, or roadmap key sequences
- **THEN** pending operator and text-object target resolution remains finite, deterministic, and safe on invalid input

### Requirement: Explicit control-key ownership is limited

The Vim keymap configuration SHALL continue protecting Pi-owned shortcuts while allowing the extension to explicitly own `Ctrl+A` and `Ctrl+X` for normal-mode numeric adjustment.

#### Scenario: Numeric adjustment controls are handled by Vim mode

- **WHEN** the editor is in normal mode and the user presses `Ctrl+A` or `Ctrl+X` with default keymap settings
- **THEN** the Vim editor treats the input as numeric adjustment rather than delegating it to Pi

#### Scenario: Insert mode remains Pi-owned for control shortcuts

- **WHEN** the editor is in insert mode and the user presses `Ctrl+A`, `Ctrl+X`, or another Pi control shortcut
- **THEN** input delegates to Pi default editor behavior unless that insert-mode shortcut is explicitly supported by pi-vimmode

#### Scenario: Other protected shortcuts remain protected

- **WHEN** `piVimMode.keymap` attempts to bind a protected Pi shortcut that pi-vimmode does not explicitly own
- **THEN** the binding is ignored or rejected with a warning and that shortcut continues to delegate to Pi behavior

### Requirement: Roadmap keymap configuration is documented and validated

The change SHALL include tests and documentation for configurable roadmap keybindings and protected shortcut behavior.

#### Scenario: Config validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default roadmap keymap resolution, configurable word-end motion, configurable finite roadmap commands, operator-motion matrix integration, invalid input safety, and protected shortcut handling

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: README documents configurable roadmap actions

- **WHEN** the user opens the project README
- **THEN** it documents which roadmap keybindings are configurable, which remain fixed or deferred, and how `Ctrl+A` / `Ctrl+X` interact with protected Pi shortcuts
