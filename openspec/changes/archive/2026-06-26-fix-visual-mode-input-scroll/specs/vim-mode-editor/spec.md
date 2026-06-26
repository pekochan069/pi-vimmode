## ADDED Requirements

### Requirement: Visual mode preserves long-prompt viewport

The Vim editor SHALL keep the visible prompt viewport stable across visual-mode transitions and vertical visual movement when the prompt has more rendered rows than the input box can show.

#### Scenario: Enter visual mode keeps viewport stable

- **WHEN** a prompt has more rendered rows than the visible input box, the cursor is already visible, and the user enters visual mode without moving the cursor
- **THEN** the top visible prompt row remains the same and visual selection highlighting appears at the cursor

#### Scenario: Exit visual mode keeps viewport stable

- **WHEN** a prompt has more rendered rows than the visible input box, the editor is in visual mode, and the user exits visual mode without changing prompt text or cursor position
- **THEN** the top visible prompt row remains the same and the editor returns to normal mode

#### Scenario: Visual down movement within viewport does not scroll

- **WHEN** the editor is in visual mode, the cursor is not on the last visible prompt row, and the user presses `j` or `Down`
- **THEN** the visual selection extends downward and the top visible prompt row remains the same

#### Scenario: Visual down movement beyond viewport scrolls minimally

- **WHEN** the editor is in visual mode, the cursor is on the last visible prompt row, and the user presses `j` or `Down` to move to a lower prompt row
- **THEN** the editor scrolls only enough to keep the cursor visible while preserving the active visual selection

#### Scenario: Stable viewport preserves render overlays

- **WHEN** visual selection, cursor styling, and search highlights are rendered in an over-height prompt
- **THEN** visual selection remains visible, search highlighting still composes with the selection, and every rendered editor row remains within terminal width
