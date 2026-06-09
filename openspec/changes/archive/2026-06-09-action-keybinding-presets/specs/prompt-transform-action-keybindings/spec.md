## ADDED Requirements

### Requirement: Action keybinding recipes are copy-pasteable and opt-in

The Vim editor SHALL document curated prompt transform action keybinding recipes as copy-pasteable `piVimMode.keymap.actions` snippets that use existing canonical `prompt.transform.*` action IDs and do not create default bindings.

#### Scenario: Paragraph editing recipe is documented

- **WHEN** user-facing settings or feature docs describe action keybinding recipes
- **THEN** they include a paragraph editing recipe that binds `prompt.transform.reflow` to `gq`, `prompt.transform.quote` to `g>`, and `prompt.transform.unquote` to `g<`

#### Scenario: Markdown wrapping recipe is documented

- **WHEN** user-facing settings or feature docs describe Markdown prompt wrapping workflows
- **THEN** they include a recipe that binds existing fence, quote, and unquote prompt transform actions using canonical `prompt.transform.*` IDs

#### Scenario: Recipe snippets parse through config

- **WHEN** an automated test resolves each documented action keybinding recipe as `piVimMode` settings
- **THEN** config validation accepts the recipe without warnings and produces accepted action bindings for every action ID and key named by the recipe

#### Scenario: Recipes do not become defaults

- **WHEN** the editor resolves default options without explicit `piVimMode.keymap.actions`
- **THEN** no prompt transform action keybindings are accepted by default, even though recipes are documented and discoverable

#### Scenario: Recipes preserve existing rejection rules

- **WHEN** a user copies a recipe into settings that disable a referenced prompt transform action or remap a recipe key into a protected/conflicting shortcut
- **THEN** existing `piVimMode.keymap.actions` validation rejects only the invalid entries with warnings while preserving valid siblings
