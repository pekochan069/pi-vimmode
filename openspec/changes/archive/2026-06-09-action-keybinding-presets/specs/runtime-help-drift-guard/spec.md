## ADDED Requirements

### Requirement: Runtime help discovers action keybinding recipes

The Vim editor SHALL expose source-backed runtime discovery for curated prompt transform action keybinding recipes without adding a new command palette, plugin API, or default binding behavior.

#### Scenario: Features query finds keybinding recipes

- **WHEN** the editor executes `:features keybindings` or an equivalent action-keybinding recipe query
- **THEN** it reports recommended prompt transform keybinding recipes and names the relevant `piVimMode.keymap.actions` surface

#### Scenario: Features output includes concrete recipe snippets

- **WHEN** runtime feature discovery reports action keybinding recipes
- **THEN** the output includes concrete action IDs and key sequences such as `prompt.transform.reflow` on `gq`, `prompt.transform.quote` on `g>`, and `prompt.transform.unquote` on `g<`

#### Scenario: Features output keeps recipes opt-in

- **WHEN** runtime feature discovery reports action keybinding recipes
- **THEN** it states or implies that the snippets are opt-in examples rather than defaults, plugin actions, diagnostic/help action dispatch, or a generic command palette

#### Scenario: Unknown recipe query remains finite

- **WHEN** the editor executes `:features` with an unsupported recipe or unsupported Vim mapping query
- **THEN** it shows the existing finite no-match response instead of inventing full Vim/Neovim mapping behavior

### Requirement: Drift guard validates action keybinding recipes

The project SHALL validate source-backed action keybinding recipes against docs, config parsing, runtime help, specs, and tests before the change is considered complete.

#### Scenario: Recipe docs anchor missing fails validation

- **WHEN** source-backed recipe metadata names a user-facing docs anchor and the docs lack that anchor
- **THEN** the docs drift guard fails with an actionable message identifying the missing recipe docs anchor

#### Scenario: Recipe config stops parsing fails validation

- **WHEN** a documented or source-backed action keybinding recipe no longer parses through `resolveVimOptions` without warnings
- **THEN** automated validation fails before the recipe can be considered copy-pasteable

#### Scenario: Recipe runtime output is tested

- **WHEN** runtime feature discovery exposes action keybinding recipes
- **THEN** automated runtime-help tests verify the query output includes the expected recipe action IDs, key sequences, and opt-in wording

#### Scenario: Recipe action IDs stay registry-backed

- **WHEN** a recipe references a `prompt.transform.*` action ID
- **THEN** automated drift validation verifies that action ID still exists in the bindable prompt transform action registry and user docs mention its docs anchor
