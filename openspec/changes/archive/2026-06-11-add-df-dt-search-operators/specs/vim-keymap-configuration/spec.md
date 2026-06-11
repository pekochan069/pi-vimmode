## ADDED Requirements

### Requirement: Configured character search commands resolve as operator targets

The Vim keymap configuration SHALL allow configured semantic character-search command bindings to serve as targets after motion-capable operators without adding arbitrary Vim grammar.

#### Scenario: Configured find-forward command works after operator

- **WHEN** `piVimMode.keymap.commands.findCharForward` is configured to a valid key sequence and the editor is in normal mode with a pending delete operator
- **THEN** pressing that configured key sequence followed by a printable target character deletes through the resolved current-line character match

#### Scenario: Configured till-forward command works after configured operator

- **WHEN** `piVimMode.keymap.operators.change` and `piVimMode.keymap.commands.tillCharForward` are configured to valid key sequences
- **THEN** pressing the configured change operator, configured till-forward command, and printable target character removes text up to but not including the resolved target and enters insert mode

#### Scenario: Multi-key character search command resolves deterministically after operator

- **WHEN** a character-search command is configured with a valid multi-key sequence that shares a prefix with another supported binding
- **THEN** the finite key sequence matcher waits for the full configured command sequence before consuming the printable target character

#### Scenario: Configured repeated character search command works after operator

- **WHEN** `piVimMode.keymap.commands.repeatCharSearch` or `piVimMode.keymap.commands.repeatCharSearchReverse` is configured to a valid key sequence and a previous character search exists
- **THEN** pressing a motion-capable operator followed by that configured repeat command applies the operator to the repeated character-search target

#### Scenario: Unsupported command after operator remains invalid

- **WHEN** the editor is in normal mode with a pending delete, change, or yank operator and the user enters a configured command that is not a supported operator target
- **THEN** the pending operator clears, prompt text is unchanged, and the unmatched key sequence is not inserted into the prompt

#### Scenario: Insert mode remains Pi-owned for character search keys

- **WHEN** the editor is in insert mode and the user presses keys configured for `findCharForward`, `findCharBackward`, `tillCharForward`, or `tillCharBackward`
- **THEN** those keys continue to delegate to Pi default editing behavior unless otherwise supported by pi-vimmode insert-mode input
