## ADDED Requirements

### Requirement: Normal and visual modes support half-page scroll motions

The Vim editor SHALL support prompt-local half-page scroll motions that move the cursor through long prompts and rely on existing cursor-driven rendering to reveal the new location.

#### Scenario: Half-page scrolls down in normal mode

- **WHEN** the editor is in normal mode with a multi-line prompt and the user presses `<C-d>`
- **THEN** the cursor moves down by the resolved half-page amount, clamped to the last prompt line

#### Scenario: Half-page scrolls up in normal mode

- **WHEN** the editor is in normal mode with a multi-line prompt and the user presses `<C-u>`
- **THEN** the cursor moves up by the resolved half-page amount, clamped to the first prompt line

#### Scenario: Count multiplies scroll amount

- **WHEN** the editor is in normal mode and the user presses `2<C-d>` or `2<C-u>`
- **THEN** the cursor moves by two resolved half-page amounts in the requested direction, clamped to prompt bounds

#### Scenario: Boundary scroll is safe

- **WHEN** the editor is in normal mode at the first prompt line and presses `<C-u>`, or at the last prompt line and presses `<C-d>`
- **THEN** prompt text, registers, marks, search highlights, and mode remain unchanged except for any cursor clamping required by the prompt bounds

#### Scenario: Visual scroll extends selection

- **WHEN** the editor is in visual, visual-line, or visual-block mode and the user presses `<C-d>` or `<C-u>`
- **THEN** the visual anchor remains unchanged and the active cursor moves by the resolved scroll motion

### Requirement: Scroll keybindings are documented and validated

The implementation SHALL include automated validation and user-facing documentation for scroll-style keybindings.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default `<C-d>` and `<C-u>` behavior, counts, prompt-boundary clamping, visual selection behavior, and existing normal-mode behavior

#### Scenario: Feature guide documents scroll keys

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `<C-d>` and `<C-u>` as prompt-local half-page scroll motions and states deferred Vim scroll features such as `<C-f>`, `<C-b>`, `zz`, `zt`, and `zb`

#### Scenario: Runtime keybinding discovery lists scroll motions

- **WHEN** runtime keybinding discovery shows supported motion keys
- **THEN** `<C-d>` and `<C-u>` appear with descriptions matching their prompt-local half-page scroll behavior
