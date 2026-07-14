## MODIFIED Requirements

### Requirement: Normal mode supports core Vim editing

The Vim editor SHALL support practical normal-mode editing commands using an extension-local unnamed register.

#### Scenario: Enter insert from normal mode

- **WHEN** the editor is in normal mode and the user presses `i`, `a`, `I`, or `A`
- **THEN** the editor enters insert mode at the current cursor, after the current cursor within the same logical line, at line start, or at line end respectively

#### Scenario: Append after an existing character

- **WHEN** the editor is in normal mode, the cursor points at an existing character, and the user presses `a`
- **THEN** the editor enters insert mode immediately after that character

#### Scenario: Append at logical line end

- **WHEN** the editor is in normal mode, the cursor is already at the current logical line's end, another logical line follows, and the user presses `a`
- **THEN** the editor enters insert mode at the current line's end and MUST NOT move to the following line

#### Scenario: Append in a wrapped prompt

- **WHEN** a logical line spans multiple terminal rows, the cursor is at that logical line's end before a following blank line, and the user presses `a`
- **THEN** terminal wrapping and prompt scrolling do not cause the cursor to cross into the following logical line

#### Scenario: Delete character under cursor

- **WHEN** the editor is in normal mode and the user presses `x`
- **THEN** the character under the cursor is deleted when one exists

#### Scenario: Delete current line

- **WHEN** the editor is in normal mode and the user presses `dd`
- **THEN** the current line is removed, the removed text is stored in the unnamed register as linewise text, and the prompt remains editable

#### Scenario: Yank and paste current line

- **WHEN** the editor is in normal mode and the user presses `yy` followed by `p`
- **THEN** the current line is copied to the unnamed register and pasted after the current line

#### Scenario: Undo delegates to Pi editor

- **WHEN** the editor is in normal mode and the user presses `u`
- **THEN** the editor invokes Pi's default undo behavior
