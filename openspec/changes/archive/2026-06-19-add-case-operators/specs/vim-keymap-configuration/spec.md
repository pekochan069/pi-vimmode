## ADDED Requirements

### Requirement: Case operators participate in semantic keymap configuration

The Vim editor SHALL expose finite case operators through `piVimMode.keymap.operators` while preserving deterministic prefix resolution for existing `g` bindings.

#### Scenario: Default case operator keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds `lowercase` to `gu`, `uppercase` to `gU`, and `toggleCase` to `g~`

#### Scenario: Configured lowercase operator works

- **WHEN** `piVimMode.keymap.operators.lowercase` is set to a valid finite key sequence and the editor is in normal mode
- **THEN** pressing that configured operator followed by a supported configured motion lowercases the addressed prompt range

#### Scenario: Configured case operator text object works

- **WHEN** `piVimMode.keymap.operators.uppercase` is configured and the editor receives that operator followed by a configured text-object kind and target
- **THEN** the addressed text object is uppercased without changing registers or mode

#### Scenario: Case operators do not capture unsupported target families

- **WHEN** the editor is in normal mode with a pending case operator and the user enters a mark, search, character-search, or unsupported command target
- **THEN** the pending operator clears, prompt text is unchanged, and the unmatched key sequence is not inserted into the prompt

#### Scenario: Invalid case operator binding falls back safely

- **WHEN** `piVimMode.keymap.operators.lowercase`, `uppercase`, or `toggleCase` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

#### Scenario: Live editor uses configured case operator

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that include a configured case operator
- **THEN** the editor uses that binding without dropping other command, motion, operator, macro, mark, search, UI, or prompt-transform options

## MODIFIED Requirements

### Requirement: Operator-motion matrix is configurable

The Vim editor SHALL use `piVimMode.keymap.operatorMotions` to determine which configured motions are valid after each configured motion-capable operator.

#### Scenario: Configured operator-motion combination executes

- **WHEN** `delete` is bound to a configured operator key and `wordForward` is included in `piVimMode.keymap.operatorMotions.delete`
- **THEN** pressing the delete operator followed by the configured `wordForward` motion deletes that text range and stores it in the unnamed character register

#### Scenario: Configured case operator-motion combination executes

- **WHEN** `lowercase` is bound to a configured operator key and `wordForward` is included in `piVimMode.keymap.operatorMotions.lowercase`
- **THEN** pressing the lowercase operator followed by the configured `wordForward` motion lowercases that text range without writing registers

#### Scenario: Configured operator-motion combination is disabled

- **WHEN** a motion action is omitted from `piVimMode.keymap.operatorMotions.uppercase`
- **THEN** pressing the configured uppercase operator followed by that motion clears the pending operator, leaves prompt text unchanged, and does not insert the motion key as text

#### Scenario: Default operator-motion matrix preserved

- **WHEN** no `piVimMode.keymap.operatorMotions` setting is configured
- **THEN** `delete`, `change`, `yank`, `lowercase`, `uppercase`, and `toggleCase` support the default finite motion actions documented for each operator family

### Requirement: Shift operators remain line-only under keymap configuration

The Vim editor SHALL NOT treat shift operators as configurable motion, search, text-object, or mark operators until range-shift semantics are explicitly specified.

#### Scenario: Shift operator motion configuration is rejected

- **WHEN** `piVimMode.keymap.operatorMotions.indent` or `piVimMode.keymap.operatorMotions.dedent` is configured
- **THEN** the unsupported operator-motion field is ignored with a warning and configured delete, change, yank, and case operator-motion fields remain usable

#### Scenario: Configured shift operator motion remains unsupported

- **WHEN** the indent or dedent operator has a configured key sequence and the user presses that operator followed by a configured motion key
- **THEN** the pending operator clears, prompt text is unchanged, registers are unchanged, and the motion key is not inserted into the prompt

#### Scenario: Settings reference documents line-only shift operators

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.operators.indent`, `piVimMode.keymap.operators.dedent`, their defaults, and the fact that `operatorMotions` excludes line-only shift operators

### Requirement: Roadmap keymap configuration is documented and validated

The change SHALL include tests and documentation for configurable roadmap keybindings and protected shortcut behavior.

#### Scenario: Config validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default roadmap keymap resolution, configurable word-end motion, configurable finite roadmap commands, configurable case operators, operator-motion matrix integration, invalid input safety, and protected shortcut handling

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: Canonical docs document configurable roadmap actions

- **WHEN** the user opens `docs/features.md` and `docs/settings.md`
- **THEN** they document which roadmap keybindings are configurable, which remain fixed or deferred, how `Ctrl+A` / `Ctrl+X` interact with protected Pi shortcuts, and how case operators participate in semantic keymap configuration
