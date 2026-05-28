## ADDED Requirements

### Requirement: Prompt search commands update highlight state

The Vim editor SHALL update visible search-highlight state after successful prompt search commands when search highlighting is enabled.

#### Scenario: Slash search updates highlights

- **WHEN** the editor is in normal mode and the user completes `/query<Enter>` with at least one literal prompt match
- **THEN** the cursor moves to the next match and visible search highlights reflect the query and current match

#### Scenario: Repeat search updates current highlight

- **WHEN** the editor has visible search highlights and the user presses `n`
- **THEN** the cursor moves according to the existing repeat-search semantics and the current-match highlight moves to the new match

#### Scenario: Reverse repeat search updates current highlight

- **WHEN** the editor has visible search highlights and the user presses `N`
- **THEN** the cursor moves according to the existing reverse-repeat semantics and the current-match highlight moves to the new match

#### Scenario: Missing search match does not replace highlights

- **WHEN** the editor has visible search highlights and a new `/query<Enter>` finds no match
- **THEN** prompt text and cursor position are unchanged and previous visible search highlights are not replaced

#### Scenario: Operator search does not render deleted text highlights

- **WHEN** a delete or change operator consumes `/query<Enter>` as a motion and changes prompt text
- **THEN** prompt text changes according to operator-search semantics and visible highlights clear or update only when still valid for remaining prompt text
