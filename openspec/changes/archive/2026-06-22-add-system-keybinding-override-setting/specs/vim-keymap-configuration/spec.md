## ADDED Requirements

### Requirement: Protected shortcut overrides require explicit allow-list

The Vim keymap configuration SHALL reject protected Pi shortcuts unless the same keymap settings layer explicitly allow-lists the normalized protected key through `piVimMode.keymap.allowProtectedOverrides`.

#### Scenario: Protected key remains rejected by default

- **WHEN** `piVimMode.keymap.commands.showKeybindings` is configured with `ctrl+p` and `piVimMode.keymap.allowProtectedOverrides` is absent
- **THEN** the `ctrl+p` binding is rejected with a protected-key warning and the shortcut continues to delegate to Pi behavior

#### Scenario: Allow-listed classic keymap binding is accepted

- **WHEN** one settings layer configures `piVimMode.keymap.allowProtectedOverrides` with `ctrl+p` and `piVimMode.keymap.commands.showKeybindings` with `ctrl+p`
- **THEN** the resolved keymap accepts `ctrl+p` for `showKeybindings` instead of rejecting it solely because it is protected

#### Scenario: Allow-listed action binding is accepted

- **WHEN** one settings layer configures `piVimMode.keymap.allowProtectedOverrides` with `ctrl+p` and binds `piVimMode.keymap.actions.prompt.transform.reflow` to `ctrl+p`
- **THEN** the resolved action keymap accepts the `ctrl+p` action binding unless another normal keymap validation rule rejects it

#### Scenario: Allow-list is scoped to its settings layer

- **WHEN** global settings allow-list `ctrl+p` but project settings bind `ctrl+p` without project `piVimMode.keymap.allowProtectedOverrides`
- **THEN** the project binding is rejected as protected and valid sibling project keymap fields remain usable

#### Scenario: Invalid allow-list entries preserve valid siblings

- **WHEN** `piVimMode.keymap.allowProtectedOverrides` contains unsupported key entries and a valid protected key entry
- **THEN** unsupported entries produce warnings, the valid protected key entry remains usable for bindings in the same settings layer, and valid sibling keymap fields remain usable

### Requirement: Allow-listed protected shortcuts dispatch in configured Vim contexts

The Vim editor SHALL route accepted allow-listed protected key bindings through the finite pi-vimmode keymap in states where the configured binding is meaningful, while preserving Pi delegation for unmapped protected keys.

#### Scenario: Normal-mode protected command dispatches

- **WHEN** `ctrl+p` is allow-listed and configured for a supported normal-mode command such as `showKeybindings`
- **THEN** pressing `ctrl+p` in normal mode invokes that pi-vimmode command instead of delegating to Pi

#### Scenario: Visual-mode protected command dispatches where supported

- **WHEN** `ctrl+p` is allow-listed and configured for a command supported from visual mode
- **THEN** pressing `ctrl+p` in visual mode invokes the configured pi-vimmode behavior instead of delegating to Pi

#### Scenario: Unmapped protected shortcut still delegates

- **WHEN** the editor receives a protected shortcut that is not accepted in the effective keymap for the current context
- **THEN** the shortcut delegates to Pi behavior and does not become an unmapped Vim key

#### Scenario: Insert mode remains Pi-owned unless explicitly configured

- **WHEN** the editor is in insert mode and receives a protected shortcut that is not configured as an accepted insert escape alias
- **THEN** the shortcut delegates to Pi behavior according to existing insert-mode rules

#### Scenario: Protected escape alias can be explicit

- **WHEN** one settings layer allow-lists `enter` and configures `piVimMode.keymap.escape` with `enter`
- **THEN** pressing `enter` in insert mode exits to normal mode instead of submitting through Pi

### Requirement: Protected override settings are documented and validated

The change SHALL include tests and user documentation for protected shortcut override settings, defaults, precedence, and runtime limits.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default protected-key rejection, allow-listed classic bindings, allow-listed action bindings, same-layer allow-list scope, invalid allow-list warnings, runtime dispatch, and preserved delegation for unmapped protected keys

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: Settings reference documents protected overrides

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.allowProtectedOverrides`, default empty behavior, same-layer allow-list scope, protected shortcut examples, and the fact that Pi/terminal input may not deliver every chord distinctly

#### Scenario: Feature guide documents shortcut ownership limits

- **WHEN** the user opens `docs/features.md`
- **THEN** it explains that pi-vimmode can override protected shortcuts only through explicit keymap configuration and only for keys Pi delivers to the editor
