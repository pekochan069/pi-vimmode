## ADDED Requirements

### Requirement: Shift operators participate in semantic keymap configuration

The Vim editor SHALL expose line-only shift operators through the semantic keymap model while preserving the default Vim keys.

#### Scenario: Default shift operator keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds `indent` to `>` and `dedent` to `<`

#### Scenario: Configured indent operator works in normal mode

- **WHEN** `piVimMode.keymap.operators.indent` is set to a valid key sequence and the editor is in normal mode
- **THEN** pressing that key sequence twice indents the current prompt line instead of requiring the default `>>` keys

#### Scenario: Configured dedent operator works in visual mode

- **WHEN** `piVimMode.keymap.operators.dedent` is set to a valid key sequence and the editor is in a visual mode with an active selection
- **THEN** pressing that key sequence dedents all prompt lines touched by the selection instead of requiring the default `<` key

#### Scenario: Invalid shift operator binding falls back safely

- **WHEN** `piVimMode.keymap.operators.indent` or `piVimMode.keymap.operators.dedent` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

### Requirement: Shift operators remain line-only under keymap configuration

The Vim editor SHALL NOT treat shift operators as configurable motion, search, text-object, or mark operators until range-shift semantics are explicitly specified.

#### Scenario: Shift operator motion configuration is rejected

- **WHEN** `piVimMode.keymap.operatorMotions.indent` or `piVimMode.keymap.operatorMotions.dedent` is configured
- **THEN** the unsupported operator-motion field is ignored with a warning and configured delete/change/yank operator-motion fields remain usable

#### Scenario: Configured shift operator motion remains unsupported

- **WHEN** the indent or dedent operator has a configured key sequence and the user presses that operator followed by a configured motion key
- **THEN** the pending operator clears, prompt text is unchanged, registers are unchanged, and the motion key is not inserted into the prompt

#### Scenario: Settings reference documents line-only shift operators

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.operators.indent`, `piVimMode.keymap.operators.dedent`, their defaults, and the fact that `operatorMotions` applies only to motion-capable delete/change/yank operators
