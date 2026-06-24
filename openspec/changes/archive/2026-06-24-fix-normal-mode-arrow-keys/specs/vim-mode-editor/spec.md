## MODIFIED Requirements

### Requirement: Normal mode supports core Vim navigation

The Vim editor SHALL support core normal-mode cursor movement across the current prompt using Vim directional keys and physical arrow-key aliases.

#### Scenario: Character navigation

- **WHEN** the editor is in normal mode and the user presses `h`, `j`, `k`, `l`, `Left`, `Down`, `Up`, or `Right`
- **THEN** the cursor moves left, down, up, or right respectively when movement is possible

#### Scenario: Counted arrow navigation

- **WHEN** the editor is in normal mode and the user enters a numeric count before an arrow key
- **THEN** the cursor moves by that count using the same bounds and line-wrapping behavior as the matching `h`, `j`, `k`, or `l` motion

#### Scenario: Line boundary navigation

- **WHEN** the editor is in normal mode and the user presses `0` or `$`
- **THEN** the cursor moves to the current line start or line end respectively

#### Scenario: Word navigation

- **WHEN** the editor is in normal mode and the user presses `w` or `b`
- **THEN** the cursor moves to the next or previous word boundary respectively

#### Scenario: Unmapped printable key

- **WHEN** the editor is in normal mode and the user presses an unmapped printable key
- **THEN** the key is ignored and no text is inserted
