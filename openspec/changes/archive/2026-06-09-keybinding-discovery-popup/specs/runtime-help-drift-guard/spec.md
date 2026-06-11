## ADDED Requirements

### Requirement: Runtime feature discovery can show keybinding popup

The Vim editor SHALL present selected keybinding-oriented runtime feature discovery in a dedicated bounded read-only overlay popup while preserving finite source-backed runtime help behavior.

#### Scenario: Features keybindings opens dedicated popup

- **WHEN** the editor executes `:features keybindings`
- **THEN** it opens a visually distinct multi-line keybinding discovery overlay rather than only a cramped one-line message or plain inline Ex/workbench row expansion

#### Scenario: Popup content is source-backed

- **WHEN** the keybinding discovery popup is shown
- **THEN** it includes source-backed action keybinding recipes or presets, canonical `prompt.transform.*` action IDs, concrete key sequences, and the relevant `piVimMode.keymap.actions` or `piVimMode.keymap.actionPresets` setting surface

#### Scenario: Popup includes effective accepted bindings

- **WHEN** the current editor has accepted configured prompt transform action bindings
- **THEN** the keybinding discovery popup reports those effective bindings using the same canonical action IDs and key vocabulary as runtime customization diagnostics

#### Scenario: Popup remains finite for unsupported mapping queries

- **WHEN** the editor executes an unsupported mapping-oriented query such as `:features runtime map` or another query that has no supported finite feature
- **THEN** it shows the existing finite no-match response rather than opening a Vim mapping browser, command palette, or help pager

### Requirement: Keybinding popup is bounded, width-safe, and locally scrollable

Runtime keybinding popup output SHALL be bounded to the terminal overlay viewport, SHALL avoid unbounded multi-line logs or Vim help-pager behavior, and SHALL provide popup-local scrolling when bounded content overflows.

#### Scenario: Popup width fits viewport

- **WHEN** the keybinding discovery popup is rendered in a narrow viewport
- **THEN** every rendered popup row is truncated or fitted to the available overlay width without overflowing

#### Scenario: Popup height is capped

- **WHEN** source-backed keybinding discovery content contains more lines than the popup can display
- **THEN** the popup keeps a bounded overlay height and shows an actionable scroll or range indicator for hidden content rather than emitting unbounded output

#### Scenario: Popup hidden rows are reachable

- **WHEN** the popup shows that additional rows are hidden below or above the current view
- **THEN** popup-local scroll controls such as `j`/`k` or arrow keys can reveal those rows without leaving the popup or editing prompt text

#### Scenario: Popup scroll is clamped

- **WHEN** the user scrolls beyond the first or last popup row
- **THEN** the popup keeps its scroll offset within valid bounds and continues rendering a bounded width-safe overlay

#### Scenario: Unrelated runtime help remains compact

- **WHEN** the editor executes runtime help commands other than popup-enabled keybinding discovery, such as `:features redo`, `:help search`, or `:messages`
- **THEN** those commands retain their existing compact runtime-help behavior unless a future spec explicitly opts them into popup display

### Requirement: Drift guard validates keybinding popup documentation

The project SHALL validate that keybinding popup runtime output, source-backed metadata, specs, tests, and user-facing docs stay aligned.

#### Scenario: Popup docs anchor missing fails validation

- **WHEN** the keybinding popup source metadata or runtime-help entry references a user-facing docs anchor and `docs/features.md` lacks that anchor
- **THEN** the docs drift guard fails with an actionable message identifying the missing popup docs anchor

#### Scenario: Popup source references registry-backed actions

- **WHEN** the keybinding popup output references a `prompt.transform.*` action ID
- **THEN** automated validation verifies that action ID exists in the bindable prompt transform action registry and remains documented

#### Scenario: Popup non-goals stay documented

- **WHEN** user-facing docs describe the keybinding discovery popup
- **THEN** docs state that the popup is finite and does not provide full Vim help tags, a command palette, runtime `:map`, runtime `:action`, recursive mappings, plugin API, diagnostic/help action keybinding dispatch, or default action keybindings
