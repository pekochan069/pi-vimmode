## MODIFIED Requirements

### Requirement: Cursor style is configurable per Vim mode

The Vim editor SHALL support settings-driven cursor styles for insert, normal, characterwise visual, and visual line modes.

#### Scenario: Default cursor styles

- **WHEN** no `piVimMode.cursor` setting is configured
- **THEN** insert mode uses a bar cursor and normal, visual, and visual line modes use block cursors

#### Scenario: Per-mode cursor style configured

- **WHEN** `piVimMode.cursor.<mode>` is set to `block`, `bar`, or `underline`
- **THEN** the Vim editor renders that cursor style whenever the corresponding mode is active

#### Scenario: Bar cursor preserves current character

- **WHEN** the active cursor style is `bar` and the cursor is positioned over a non-empty character cell
- **THEN** the rendered cursor cell includes the underlying character, applies bar cursor styling, and remains one visible cell wide

#### Scenario: Bar cursor handles empty cursor cells

- **WHEN** the active cursor style is `bar` and the cursor is positioned at the end of a line or another empty cursor cell
- **THEN** the Vim editor renders a visible one-cell bar cursor placeholder without hiding adjacent text

#### Scenario: Cursor style updates on mode transition

- **WHEN** the editor changes between insert, normal, visual, and visual line modes
- **THEN** the rendered cursor style updates to match the active mode configuration

#### Scenario: Invalid cursor style setting

- **WHEN** a cursor style setting is missing or unsupported
- **THEN** the Vim editor uses the default cursor style for that mode and does not fail session startup
