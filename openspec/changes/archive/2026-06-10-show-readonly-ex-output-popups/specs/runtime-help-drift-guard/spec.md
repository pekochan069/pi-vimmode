## ADDED Requirements

### Requirement: Drift guard validates read-only Ex popup command coverage

The project SHALL validate that source-backed runtime help, diagnostic action metadata, user docs, specs, and tests agree on which read-only Ex commands open the generic popup.

#### Scenario: Popup command missing from docs fails validation

- **WHEN** source-backed popup metadata lists a read-only Ex command such as `:help`, `:features`, `:actions`, `:keymap`, `:mapcheck`, `:messages`, `:vimmode inspect`, or `:vimdoctor` and `docs/features.md` lacks the corresponding popup documentation anchor
- **THEN** the docs drift guard fails with an actionable message identifying the missing command or docs anchor

#### Scenario: Popup command missing from finite parser fails validation

- **WHEN** source-backed popup metadata lists a command-backed read-only Ex popup entry
- **THEN** automated validation verifies that the finite Ex parser supports that exact command syntax or the metadata declares an explicit non-command exception

#### Scenario: Stale compact-output claim fails validation

- **WHEN** docs, runtime help metadata, or tests claim that a successful read-only Ex help or diagnostic command still uses only the compact inline row as its normal display path
- **THEN** docs drift validation fails before the change is considered complete

## MODIFIED Requirements

### Requirement: Runtime feature discovery can show keybinding popup

The Vim editor SHALL present source-backed runtime help and feature discovery output in a dedicated bounded read-only overlay popup while preserving finite source-backed runtime help behavior and the existing keybinding discovery content.

#### Scenario: Features keybindings opens dedicated popup

- **WHEN** the editor executes `:features keybindings`
- **THEN** it opens a visually distinct multi-line keybinding discovery overlay rather than only a cramped one-line message or plain inline Ex/workbench row expansion

#### Scenario: General features opens dedicated popup

- **WHEN** the editor executes `:features` with no query
- **THEN** it opens a visually distinct multi-line read-only overlay that summarizes finite supported feature categories instead of rendering the normal output only in the compact workbench row

#### Scenario: Feature query opens dedicated popup

- **WHEN** the editor executes `:features redo` or another supported finite feature query
- **THEN** it opens a bounded read-only popup containing the source-backed feature result

#### Scenario: Help topic opens dedicated popup

- **WHEN** the editor executes `:help` or `:help search`
- **THEN** it opens a bounded read-only popup containing the source-backed help index, help topic, or no-match result

#### Scenario: Popup content is source-backed

- **WHEN** a runtime help or feature discovery popup is shown
- **THEN** it includes source-backed help, feature, diagnostic action, action keybinding recipe, preset, setting, or limitation metadata rather than invented Vim/Neovim behavior

#### Scenario: Popup includes effective accepted bindings

- **WHEN** the current editor has accepted configured prompt transform action bindings and a keybinding-oriented popup query is shown
- **THEN** the popup reports those effective bindings using the same canonical action IDs and key vocabulary as runtime customization diagnostics

#### Scenario: Popup remains finite for unsupported mapping queries

- **WHEN** the editor executes an unsupported mapping-oriented query such as `:features runtime map` or another query that has no supported finite feature
- **THEN** it shows the finite no-match response in the read-only popup rather than opening a Vim mapping browser, command palette, help pager, or compact-only fallback

### Requirement: Keybinding popup is bounded, width-safe, and locally scrollable

Runtime read-only popup output SHALL be bounded to the terminal overlay viewport, SHALL avoid unbounded multi-line logs or Vim help-pager behavior, and SHALL provide popup-local scrolling when bounded content overflows.

#### Scenario: Popup width fits viewport

- **WHEN** a runtime help, feature discovery, customization diagnostic, message, inspectability, or keybinding discovery popup is rendered in a narrow viewport that can fit the minimum popup
- **THEN** every rendered popup row is truncated or fitted to the available overlay width without overflowing

#### Scenario: Popup height is capped

- **WHEN** source-backed read-only popup content contains more lines than the popup can display
- **THEN** the popup keeps a bounded overlay height and shows an actionable scroll or range indicator for hidden content rather than emitting unbounded output

#### Scenario: Popup hidden rows are reachable

- **WHEN** the popup shows that additional rows are hidden below or above the current view
- **THEN** popup-local scroll controls such as `j`/`k` or arrow keys can reveal those rows without leaving the popup or editing prompt text

#### Scenario: Popup scroll is clamped

- **WHEN** the user scrolls beyond the first or last popup row
- **THEN** the popup keeps its scroll offset within valid bounds and continues rendering a bounded width-safe overlay

#### Scenario: Read-only runtime help uses popup

- **WHEN** the editor executes runtime help commands other than keybinding discovery, such as `:features redo`, `:help search`, or `:messages`
- **THEN** those commands use the read-only popup display path for successful bounded output rather than retaining compact inline output as their normal display path

### Requirement: Drift guard validates keybinding popup documentation

The project SHALL validate that generic read-only popup runtime output, keybinding popup output, source-backed metadata, specs, tests, and user-facing docs stay aligned.

#### Scenario: Popup docs anchor missing fails validation

- **WHEN** read-only popup source metadata, keybinding popup source metadata, or runtime-help entry references a user-facing docs anchor and `docs/features.md` lacks that anchor
- **THEN** the docs drift guard fails with an actionable message identifying the missing popup docs anchor

#### Scenario: Popup source references registry-backed actions

- **WHEN** popup output references a `prompt.transform.*` action ID
- **THEN** automated validation verifies that action ID exists in the bindable prompt transform action registry and remains documented

#### Scenario: Popup non-goals stay documented

- **WHEN** user-facing docs describe the read-only Ex popup or keybinding discovery popup
- **THEN** docs state that the popup is finite and does not provide full Vim help tags, a command palette, runtime `:map`, runtime `:action`, recursive mappings, plugin API, diagnostic/help action keybinding dispatch, or default action keybindings
