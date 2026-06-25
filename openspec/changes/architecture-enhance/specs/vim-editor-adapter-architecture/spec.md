## ADDED Requirements

### Requirement: Visual selection semantics live behind a focused pure seam

The modal editing architecture SHALL concentrate visual-selection range normalization, selected-text extraction, visual edit targeting, and visual summary derivation in a focused pure module while preserving existing modal, buffer, renderer, and Ex command-line behavior.

#### Scenario: Visual selection operations preserve behavior

- **WHEN** characterwise, linewise, or blockwise visual yank, delete, change, indent, dedent, or case operations run after visual-selection extraction
- **THEN** prompt text edits, unnamed register content, cursor placement, mode transitions, dot-repeat behavior, marks, search highlights, and macro side effects match the behavior before extraction

#### Scenario: Visual rendering uses extracted selection semantics

- **WHEN** the editor renders active characterwise, linewise, or blockwise visual selection after extraction
- **THEN** highlighted cells, cursor precedence, empty selected line handling, and width safety match existing visual rendering expectations

#### Scenario: Ex visual range marker stays line-oriented

- **WHEN** Ex command-line mode opens from any current visual selection
- **THEN** it preserves the existing line-oriented `'<,'>` visual range marker behavior and does not introduce characterwise or blockwise Ex range semantics

#### Scenario: Prompt buffer keeps general text primitives

- **WHEN** modal, range, or renderer code needs visual-selection facts after extraction
- **THEN** it uses the visual-selection seam instead of duplicating range normalization or selected-text derivation in prompt buffer call sites

#### Scenario: Visual-selection seam stays Pi-independent

- **WHEN** visual-selection helpers are imported in tests
- **THEN** they run without constructing Pi `CustomEditor`, TUI, theme, keybinding, or lifecycle objects

#### Scenario: Behavior-preserving extraction is validated

- **WHEN** `bun test` is executed after extraction
- **THEN** focused tests cover visual range normalization, text extraction, visual edit targets, summaries, renderer selection mapping, modal visual operations, and Ex visual range prefill compatibility
