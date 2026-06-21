## ADDED Requirements

### Requirement: Configured escape aliases leave insert mode, visual modes, and pending Ex command-lines

The Vim editor SHALL treat configured `piVimMode.keymap.escape` sequences as aliases for physical `Esc` in insert mode when autocomplete is inactive and in visual modes, and while an Ex command-line is pending, while preserving default insert-mode delegation for all unrelated input.

#### Scenario: Configured alias exits insert mode

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>`, autocomplete is inactive, and the editor is in insert mode
- **THEN** pressing the corresponding modified `j` key enters normal mode and does not insert text into the prompt

#### Scenario: Physical escape remains supported

- **WHEN** the editor is in insert mode and the user presses physical `Esc`
- **THEN** the editor follows existing behavior and enters normal mode when autocomplete is inactive

#### Scenario: Unrelated insert text remains delegated

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>` and the editor receives ordinary insert-mode text
- **THEN** the text is delegated to Pi's default editor behavior and inserted normally

#### Scenario: Raw text chords remain text

- **WHEN** `piVimMode.keymap.escape` is configured with raw text such as `jk`
- **THEN** the invalid alias is ignored, typing `j` followed by `k` inserts `jk`, and the editor remains in insert mode

#### Scenario: Alias does not fire while autocomplete is open

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>`, Pi autocomplete is open, and the editor is in insert mode
- **THEN** pressing the configured modified key delegates to Pi autocomplete/default editing behavior instead of entering normal mode

#### Scenario: Configured alias exits visual modes

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>` and the editor is in visual, visual-line, or visual-block mode
- **THEN** pressing the corresponding modified key cancels visual selection and enters normal mode like physical `Esc`

#### Scenario: Normal mode keeps existing key behavior

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>` and the editor is in normal mode
- **THEN** existing normal-mode behavior remains unchanged and the escape alias is not evaluated

### Requirement: Insert escape aliases preserve modal side effects

The Vim editor SHALL integrate insert escape alias handling with existing modal state, adapter fast-path, macro, redo, and render boundaries without changing default behavior when aliases are absent.

#### Scenario: Fast path remains safe

- **WHEN** `piVimMode.keymap.escape` includes `<D-j>`
- **THEN** ordinary insert text may still use the guarded insert fast path, while configured alias input is routed through modal handling

#### Scenario: Macro recording preserves alias behavior

- **WHEN** macro recording is active and the user records insert text followed by a configured insert escape alias
- **THEN** replaying the macro reproduces the same inserted text and mode transition without inserting escape alias text

#### Scenario: Redo and search state remain consistent

- **WHEN** insert escape alias handling routes input through modal handling
- **THEN** redo history, search highlights, transient messages, visual state, registers, marks, and cursor styling follow the same side-effect rules as equivalent existing insert-mode delegation and physical `Esc` transitions

#### Scenario: Default behavior is unchanged without aliases

- **WHEN** no `piVimMode.keymap.escape` setting is configured
- **THEN** insert-mode typing, physical `Esc`, autocomplete, Pi shortcuts, macro recording/replay, and fast-path delegation behave as they did before this change

#### Scenario: Automated validation covers insert escape behavior

- **WHEN** `bun test` is executed
- **THEN** tests cover alias success, raw text rejection, autocomplete preservation, visual mode escape, normal-mode non-participation, macro recording/replay, fast-path guarding, and default behavior without aliases
