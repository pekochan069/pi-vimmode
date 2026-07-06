## ADDED Requirements

### Requirement: Trusted global JS keymap builder adds prompt built-in bindings

The Vim editor SHALL load a trusted global JS config file from `~/.pi/agent/pi-vimmode.config.js` after global JSON settings and before project JSON settings.

#### Scenario: JS builder uses prompt built-ins instead of internal action strings

- **WHEN** the JS config default export calls `vim.keymap.set("n", "zq", vim.prompt.reflow({ width: 88 }))`
- **THEN** the resolved keymap binds `zq` to the reflow prompt transform with width `88`
- **AND** raw string RHS values such as `"prompt.transform.reflow"` are treated only as key replay text, not internal action IDs

#### Scenario: JS builder additions preserve preset bindings

- **WHEN** global JSON enables the paragraph editing action preset and JS config adds `vim.keymap.set("n", "zq", vim.prompt.reflow())`
- **THEN** both the preset `gq` binding and the JS `zq` binding are accepted for reflow

#### Scenario: Project JSON remains authoritative

- **WHEN** JS config adds a reflow keybinding and project JSON sets `piVimMode.keymap.actions.prompt.transform.reflow` to an empty array
- **THEN** the resolved action keybindings contain no reflow keybindings

#### Scenario: JS string rhs replays key inputs

- **WHEN** the JS config default export calls `vim.keymap.set("n", "zz", "llll")`
- **THEN** pressing `zz` in normal mode replays `l`, `l`, `l`, `l` through the existing macro replay path

#### Scenario: JS insert built-ins bind only insert mode

- **WHEN** JS config calls `vim.keymap.set("i", "<A-w>", vim.prompt.deleteWordBackward())`
- **THEN** insert mode treats `alt+w` as the configured delete-word-backward action
- **AND** using that insert builtin in normal or visual mode is rejected with a warning

#### Scenario: JS config is trusted global code only

- **WHEN** Pi loads settings for a project
- **THEN** pi-vimmode does not load project-local executable JS config
- **AND** unsupported JS default exports fail with warnings instead of crashing startup

### Requirement: Prompt transform action keybindings may be mode scoped

The Vim editor SHALL allow prompt transform action bindings to carry explicit normal/visual mode scopes.

#### Scenario: Normal-scoped action key does not leak into visual mode

- **WHEN** a prompt transform action keybinding has modes `["normal"]`
- **THEN** the key invokes that action in normal mode
- **AND** the same key does not invoke that action from visual, visual-line, or visual-block mode

#### Scenario: Visual alias scopes all visual modes

- **WHEN** JS config calls `vim.keymap.set("v", "z>", vim.prompt.quote())`
- **THEN** the key invokes quote from visual, visual-line, and visual-block modes
