## ADDED Requirements

### Requirement: Scroll motions participate in semantic keymap configuration

The Vim editor SHALL expose prompt-local half-page scroll motions through the semantic keymap model while preserving finite deterministic key resolution.

#### Scenario: Default scroll keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal or visual mode
- **THEN** the resolved keymap binds `halfPageDown` to `<C-d>` and `halfPageUp` to `<C-u>`

#### Scenario: Configured scroll motion key is used

- **WHEN** `piVimMode.keymap.motions.halfPageDown` or `piVimMode.keymap.motions.halfPageUp` is set to a valid key sequence
- **THEN** that key sequence performs the matching scroll motion in normal and visual contexts where motions are supported

#### Scenario: Scroll motions are not default operator motions

- **WHEN** no `piVimMode.keymap.operatorMotions` setting is configured
- **THEN** `delete`, `change`, and `yank` do not treat `<C-d>` or `<C-u>` as supported operator-motion targets

#### Scenario: Scroll operator-motion config is safe

- **WHEN** `piVimMode.keymap.operatorMotions` attempts to include `halfPageDown` or `halfPageUp` for `delete`, `change`, or `yank`
- **THEN** the unsupported operator-motion entry is ignored or rejected with a warning and does not corrupt prompt text or registers

#### Scenario: Settings docs document scroll motion configuration

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents the `halfPageDown` and `halfPageUp` motion action names, defaults, and operator-motion limitation

## MODIFIED Requirements

### Requirement: Explicit control-key ownership is limited

The Vim keymap configuration SHALL continue protecting Pi-owned shortcuts while allowing the extension to explicitly own `Ctrl+A` and `Ctrl+X` for normal-mode numeric adjustment and `Ctrl+D` and `Ctrl+U` for normal/visual-mode scroll motions.

#### Scenario: Numeric adjustment controls are handled by Vim mode

- **WHEN** the editor is in normal mode and the user presses `Ctrl+A` or `Ctrl+X` with default keymap settings
- **THEN** the Vim editor treats the input as numeric adjustment rather than delegating it to Pi

#### Scenario: Scroll controls are handled by Vim mode

- **WHEN** the editor is in normal or visual mode and the user presses `Ctrl+D` or `Ctrl+U` with default keymap settings
- **THEN** the Vim editor treats the input as prompt-local half-page scroll motion rather than delegating it to Pi

#### Scenario: Insert mode remains Pi-owned for control shortcuts

- **WHEN** the editor is in insert mode and the user presses `Ctrl+A`, `Ctrl+X`, `Ctrl+D`, `Ctrl+U`, or another Pi control shortcut
- **THEN** input delegates to Pi default editor behavior unless that insert-mode shortcut is explicitly supported by pi-vimmode

#### Scenario: Other protected shortcuts remain protected

- **WHEN** `piVimMode.keymap` attempts to bind a protected Pi shortcut that pi-vimmode does not explicitly own
- **THEN** the binding is ignored or rejected with a warning and that shortcut continues to delegate to Pi behavior
