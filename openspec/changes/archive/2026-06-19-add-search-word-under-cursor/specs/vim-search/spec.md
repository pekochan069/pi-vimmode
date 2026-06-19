## ADDED Requirements

### Requirement: Normal mode searches word under cursor

The Vim editor SHALL support normal-mode word-under-cursor prompt search commands that derive a literal keyword-word query from the current prompt cursor and use existing prompt search repeat state. A keyword word is a contiguous run of ASCII letters, digits, and `_`. A cursor on a keyword character uses that containing word; a cursor immediately after a keyword word, including at line end, uses that preceding word.

#### Scenario: Star searches current word forward

- **WHEN** the editor is in normal mode, the cursor is on a keyword word, and the user presses `*`
- **THEN** the cursor moves to the next wrapped literal match for that word and the last search is recorded with that query, forward direction, and literal matcher mode

#### Scenario: Hash searches current word backward

- **WHEN** the editor is in normal mode, the cursor is on a keyword word, and the user presses `#`
- **THEN** the cursor moves to the previous wrapped literal match for that word and the last search is recorded with that query, backward direction, and literal matcher mode

#### Scenario: Cursor at word end searches preceding word

- **WHEN** the editor is in normal mode and the prompt cursor is immediately after a keyword word
- **THEN** pressing `*` or `#` uses that preceding keyword word as the literal search query

#### Scenario: Word search on a unique word records search without moving

- **WHEN** the editor is in normal mode, the cursor resolves to a keyword word that has no other literal match in the prompt, and the user presses `*` or `#`
- **THEN** the cursor stays on that word, and the last search, search history, and visible highlights are recorded with that word query so `n` and `N` repeat consistently

#### Scenario: Missing word is safe

- **WHEN** the editor is in normal mode and the cursor is not on or immediately after a keyword word
- **THEN** pressing `*` or `#` leaves prompt text, cursor position, visible search highlight, search history, and last-search state unchanged

#### Scenario: Repeat search follows star direction

- **WHEN** the user presses `*` on a matching keyword word and then presses `n`
- **THEN** repeat search moves to the next wrapped literal match for that same word

#### Scenario: Reverse repeat search follows star direction

- **WHEN** the user presses `*` on a matching keyword word and then presses `N`
- **THEN** repeat search moves to the previous wrapped literal match for that same word

#### Scenario: Repeat search follows hash direction

- **WHEN** the user presses `#` on a matching keyword word and then presses `n`
- **THEN** repeat search moves to the previous wrapped literal match for that same word

#### Scenario: Word search updates prompt-local search history

- **WHEN** `*` or `#` successfully moves to a literal word match
- **THEN** the normalized literal query is added to the current editor instance search history without changing prompt text

#### Scenario: Word search updates visible highlights when enabled

- **WHEN** search highlighting is enabled and `*` or `#` successfully moves to a literal word match
- **THEN** visible search highlights use that word query and mark the current match at the restored cursor position

### Requirement: Word-under-cursor search behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for word-under-cursor prompt search behavior.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover `*`, `#`, insertion-point word-end extraction, missing-word no-op behavior, unique-word no-move behavior, `n` and `N` repeat semantics after `*` and `#`, search history, search highlights, insert-mode delegation, and configured key bindings

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide describes word search

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `*` and `#` as normal-mode literal keyword-word prompt search commands, explains repeat behavior with `n` and `N`, and lists current limitations

#### Scenario: TODO marks word search complete after validation

- **WHEN** word-under-cursor search implementation and validation pass
- **THEN** `TODOS.md` marks the `*` / `#` search word under cursor item complete while leaving unrelated remaining TODO items unchanged
