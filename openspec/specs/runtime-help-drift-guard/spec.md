# runtime-help-drift-guard Specification

## Purpose

TBD - created by archiving change runtime-help-docs-spec-drift-guard. Update Purpose after archive.
## Requirements
### Requirement: Runtime help is finite and source-backed

The Vim editor SHALL provide finite runtime help that describes supported pi-vimmode behavior and explicit limitations without implying full Vim or Neovim parity.

#### Scenario: General help lists entry points

- **WHEN** the editor executes `:help` with no topic
- **THEN** the editor shows a compact transient help message that names supported entry points such as `:help <topic>`, `:features [query]`, `:messages`, `:actions`, `:keymap`, `:mapcheck`, and `:vimdoctor`

#### Scenario: Topic help describes supported behavior and limits

- **WHEN** the editor executes `:help search`, `:help ex`, or another supported topic
- **THEN** the editor shows a compact transient message based on source-backed help metadata that includes supported pi-vimmode behavior and at least one relevant limitation when the topic has known limits

#### Scenario: Unknown help topic is rejected without parity fallback

- **WHEN** the editor executes `:help vimscript` or another topic that has no supported help entry
- **THEN** the editor shows a transient no-match message and does not fall back to Vim help tags, Vimscript documentation, or external files

### Requirement: Feature matrix is discoverable and searchable

The Vim editor SHALL expose a searchable runtime feature matrix for supported pi-vimmode feature areas, commands, actions, and limits.

#### Scenario: Feature list summarizes categories

- **WHEN** the editor executes `:features` with no query
- **THEN** the editor shows a compact transient summary of supported feature categories such as modes, motions, editing, search, Ex commands, prompt transforms, registers, marks, macros, customization diagnostics, settings, and Pi shortcut compatibility

#### Scenario: Feature query finds supported command

- **WHEN** the editor executes `:features nohlsearch`
- **THEN** the editor reports that `:noh` / `:nohlsearch` are supported for clearing visible prompt search highlights while preserving repeat-search state

#### Scenario: Feature query finds semantic action

- **WHEN** the editor executes `:features redo` and redo is present in the resolved keymap
- **THEN** the editor reports the matching supported action and its current binding when one exists

#### Scenario: Feature query reports disabled runtime options

- **WHEN** the editor executes `:features macros` in an editor whose macro support is disabled by resolved options
- **THEN** the editor reports that macro controls are disabled for the current editor rather than describing them as active

#### Scenario: Feature query rejects unsupported behavior

- **WHEN** the editor executes `:features vimscript` or another query that matches no supported finite feature
- **THEN** the editor shows a transient no-match message rather than inventing unsupported Vim behavior

### Requirement: Runtime messages are inspectable

The Vim editor SHALL allow users to inspect recent runtime messages without adding a pager or persistent log.

#### Scenario: Messages command reports recent message state

- **WHEN** the editor has emitted one or more transient runtime messages and then executes `:messages`
- **THEN** the editor shows a compact transient summary containing the retained message count and the most recent retained message

#### Scenario: Messages command handles empty history

- **WHEN** the editor executes `:messages` before any runtime messages have been retained
- **THEN** the editor shows a compact transient message indicating that no runtime messages are retained

#### Scenario: Messages history is bounded

- **WHEN** the editor emits more runtime messages than the retained history cap
- **THEN** older messages are discarded and `:messages` reports only bounded recent message state

#### Scenario: Messages introspection does not pollute history

- **WHEN** the editor executes `:messages` repeatedly
- **THEN** the `:messages` output itself is not appended to the retained message history

### Requirement: Runtime help commands preserve prompt editing state

Runtime help and feature discovery SHALL be read-only with respect to prompt editing state.

#### Scenario: Help command leaves editing state unchanged

- **WHEN** the editor executes `:help`, `:features`, or `:messages`
- **THEN** prompt text, cursor position, mode, visual selection, search highlights, registers, marks, macro slots, macro replay state, and dot-repeat state remain unchanged except for the transient informational message

#### Scenario: Help command from visual Ex restores visual state

- **WHEN** Ex command-line mode was opened from a visual selection, the user deletes the prefilled visual range marker, and the user executes `:help`, `:features`, or `:messages`
- **THEN** the command exits Ex mode without editing prompt text and restores the original visual mode state according to existing Ex cancellation behavior

### Requirement: Docs drift guard validates runtime help contracts

The project SHALL include development-time validation that fails when user-facing docs, source-backed runtime help metadata, durable specs, or test anchors contradict each other for supported pi-vimmode behavior.

#### Scenario: Supported command missing from docs fails validation

- **WHEN** source-backed help metadata lists a supported runtime command and `docs/features.md` lacks its required docs anchor
- **THEN** the docs drift guard fails in the normal validation path

#### Scenario: Stale unsupported claim fails validation

- **WHEN** user-facing docs claim `:noh`, `:nohlsearch`, or another source-supported command is unsupported
- **THEN** the docs drift guard fails with an actionable message identifying the contradictory claim

#### Scenario: Missing spec or test anchor fails validation

- **WHEN** a source-backed feature registry entry lacks a required OpenSpec spec anchor or test anchor without an explicit approved exception
- **THEN** the docs drift guard fails before the change is considered complete

### Requirement: Drift guard validates prompt transform action registry claims

The project SHALL validate that prompt transform action registry metadata, runtime diagnostics, specs, tests, and user-facing docs stay aligned.

#### Scenario: Public action ID missing from docs fails validation

- **WHEN** a bindable prompt transform action ID exists in the registry and user docs do not mention it or its docs anchor
- **THEN** the docs drift guard fails in the normal validation path

#### Scenario: Documented action ID missing from registry fails validation

- **WHEN** user docs mention a `prompt.transform.*` action ID that is absent from the registry
- **THEN** the docs drift guard fails with an actionable message

#### Scenario: Registry docs anchor missing fails validation

- **WHEN** a registry action entry references a docs anchor that does not exist in docs
- **THEN** the docs drift guard fails before the change is considered complete

#### Scenario: Example keymap actions config parses successfully

- **WHEN** docs include an example `piVimMode.keymap.actions` configuration
- **THEN** an automated test parses the example or an equivalent fixture successfully

#### Scenario: Legacy alias behavior is tested

- **WHEN** legacy `promptTransform.*` aliases are supported for diagnostics
- **THEN** tests verify the alias maps to canonical `prompt.transform.*` output until the alias removal TODO is completed

### Requirement: Runtime help classifies diagnostic action metadata

The Vim editor SHALL use source-backed diagnostic/help action metadata when runtime help and feature discovery describe supported diagnostic surfaces.

#### Scenario: Features query finds diagnostic metadata

- **WHEN** the editor executes `:features vimmode.doctor`, `:features vimdoctor`, or another supported diagnostic/help action query
- **THEN** it reports the matching finite command, diagnostic/runtime-help category, metadata-only status, and at least one relevant limitation such as no plugin API or no keybinding dispatch

#### Scenario: General features separates diagnostics and runtime help

- **WHEN** the editor executes `:features` without a query
- **THEN** the summary names diagnostics and runtime help as distinct finite feature categories rather than merging them into prompt transforms, keymap actions, or a general command palette

#### Scenario: Help topic explains diagnostic action limits

- **WHEN** the editor executes `:help actions`, `:help diagnostics`, or another supported topic covering diagnostic/help metadata
- **THEN** the help message identifies the finite supported commands and states that diagnostic/help action IDs are metadata-only and not user-plugin or keybinding dispatch targets

### Requirement: Drift guard validates diagnostic action metadata

The project SHALL validate diagnostic/help action metadata against docs, specs, tests, and finite parser support before the change is considered complete.

#### Scenario: Metadata docs anchor missing fails validation

- **WHEN** a diagnostic/help metadata entry requires a `docs/features.md` anchor and that anchor is missing
- **THEN** the docs drift guard fails with an actionable message identifying the metadata entry and missing anchor

#### Scenario: Metadata spec or test anchor missing fails validation

- **WHEN** a diagnostic/help metadata entry references a missing durable spec file or missing test anchor
- **THEN** the docs drift guard fails before the registry can be considered aligned

#### Scenario: Command-backed metadata must match finite Ex support

- **WHEN** a diagnostic/help metadata entry names an Ex command such as `vimdoctor`, `actions`, `features`, `messages`, or `vimmode inspect`
- **THEN** automated validation verifies that the command is supported by the finite parser or the entry declares an explicit non-command exception

#### Scenario: Metadata-only invariant is validated

- **WHEN** a diagnostic/help metadata entry is included in runtime discovery
- **THEN** automated validation verifies that the entry is not part of the bindable prompt transform action ID set accepted by `piVimMode.keymap.actions`

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

### Requirement: Runtime help discovers action keybinding presets

The Vim editor SHALL expose source-backed runtime discovery for named action keybinding presets without adding a command palette, plugin API, runtime mapping command, or default binding behavior.

#### Scenario: Features query finds action presets

- **WHEN** the editor executes `:features keybindings`, `:features action presets`, or a supported action preset name query
- **THEN** it reports available action keybinding presets and names the `piVimMode.keymap.actionPresets` setting surface

#### Scenario: Features output includes concrete preset bindings

- **WHEN** runtime feature discovery reports action keybinding presets
- **THEN** the output includes concrete preset IDs, action IDs, and key sequences such as `paragraph-editing`, `prompt.transform.reflow` on `gq`, `prompt.transform.quote` on `g>`, and `prompt.transform.unquote` on `g<`

#### Scenario: Features output keeps presets opt-in

- **WHEN** runtime feature discovery reports action keybinding presets
- **THEN** it states or implies that presets are opt-in and create no default bindings, plugin actions, diagnostic/help keybinding dispatch, or generic command palette behavior

#### Scenario: Unknown preset query remains finite

- **WHEN** the editor executes `:features` with an unsupported preset, unsupported recipe, or unsupported Vim mapping query
- **THEN** it shows the existing finite no-match response instead of inventing full Vim/Neovim mapping behavior

### Requirement: Drift guard validates action keybinding presets

The project SHALL validate source-backed action keybinding presets against docs, config parsing, runtime help, specs, and tests before the change is considered complete.

#### Scenario: Preset docs anchor missing fails validation

- **WHEN** source-backed preset metadata names a user-facing docs anchor and the docs lack that anchor
- **THEN** the docs drift guard fails with an actionable message identifying the missing preset docs anchor

#### Scenario: Preset config stops parsing fails validation

- **WHEN** a source-backed action keybinding preset no longer resolves through `resolveVimOptions` without unexpected warnings
- **THEN** automated validation fails before the preset can be considered selectable

#### Scenario: Preset runtime output is tested

- **WHEN** runtime feature discovery exposes action keybinding presets
- **THEN** automated runtime-help tests verify the query output includes expected preset IDs, action IDs, key sequences, setting name, and opt-in wording

#### Scenario: Preset action IDs stay registry-backed

- **WHEN** a preset references a `prompt.transform.*` action ID
- **THEN** automated drift validation verifies that action ID exists in the bindable prompt transform action registry and user docs mention its docs anchor

#### Scenario: Preset and recipe metadata stay aligned

- **WHEN** a preset is backed by an existing action keybinding recipe
- **THEN** automated drift validation verifies that the preset and recipe share the intended action IDs, key sequences, docs anchors or cross-links, and expected resolved bindings

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

### Requirement: Runtime discovery includes dedicated keybindings command

Runtime help and feature discovery SHALL identify `:keybindings` as the dedicated source-backed keybinding discovery entry point while preserving existing `:features keybindings` behavior.

#### Scenario: General help lists keybindings entry point

- **WHEN** the editor displays general runtime help or feature discovery summaries
- **THEN** the output names `:keybindings` as a finite read-only popup command for effective keybinding discovery

#### Scenario: Existing features keybindings remains supported

- **WHEN** the editor executes `:features keybindings`
- **THEN** it continues to open source-backed keybinding discovery popup output rather than becoming unsupported or silently changing meaning

#### Scenario: Unsupported mapping queries remain finite

- **WHEN** runtime help or feature discovery receives unsupported mapping-oriented queries such as `vimscript mappings`, `runtime map`, or `nmap`
- **THEN** it returns finite no-match output and does not imply full Vim mapping support

### Requirement: Drift guard validates keybindings popup command coverage

The project SHALL validate that the dedicated keybindings popup command stays aligned across parser support, popup metadata, runtime help, user docs, specs, and tests.

#### Scenario: Keybindings command missing from docs fails validation

- **WHEN** source-backed popup command metadata lists `:keybindings` and `docs/features.md` lacks the corresponding read-only popup documentation anchor or command mention
- **THEN** docs drift validation fails with an actionable message identifying the missing keybindings command coverage

#### Scenario: Keybindings command missing from finite parser fails validation

- **WHEN** source-backed popup command metadata lists `:keybindings`
- **THEN** automated validation verifies that the finite Ex parser supports `keybindings` with optional query syntax

#### Scenario: Keybindings command missing from tests fails validation

- **WHEN** runtime help, diagnostic metadata, or popup metadata references `:keybindings`
- **THEN** automated validation verifies that at least one test anchor covers parser/runtime popup behavior and one test anchor covers docs or metadata drift

#### Scenario: Keybindings non-goals stay documented

- **WHEN** user-facing docs describe `:keybindings`
- **THEN** docs state that it is finite read-only discovery and does not provide runtime `:map`, recursive mappings, Vimscript, a command palette, plugin dispatch, or default action keybindings

#### Scenario: Keybinding catalog references registry-backed actions

- **WHEN** keybindings popup output references `prompt.transform.*` action IDs or `vimmode.*` diagnostic/help metadata IDs
- **THEN** automated validation verifies that those IDs remain backed by the appropriate source registry and docs anchors

