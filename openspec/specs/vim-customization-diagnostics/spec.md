# vim-customization-diagnostics Specification

## Purpose

TBD - created by archiving change self-explaining-customization-suite. Update Purpose after archive.
## Requirements
### Requirement: Runtime customization diagnostics are available

The Vim editor SHALL provide runtime diagnostics that explain the current customization state without requiring users to inspect settings files or source code.

#### Scenario: Doctor reports healthy customization state

- **WHEN** the editor executes `:vimdoctor` with no retained settings warnings and no detected keymap conflicts
- **THEN** the editor shows a transient message indicating customization is healthy

#### Scenario: Doctor reports settings warnings

- **WHEN** the editor executes `:vimdoctor` after settings resolution recorded invalid fields, protected keys, or keymap conflicts
- **THEN** the editor shows a transient message that includes the warning count and the highest-priority actionable warning

#### Scenario: Doctor does not reread settings files

- **WHEN** the editor executes `:vimdoctor`
- **THEN** diagnostics are based on the options and warnings retained for that editor instance rather than re-reading global or project settings files

### Requirement: Customization commands preserve prompt editing state

Runtime customization diagnostics SHALL be read-only with respect to prompt editing state.

#### Scenario: Diagnostic command leaves prompt text unchanged

- **WHEN** the editor executes `:vimdoctor`, `:keymap`, `:mapcheck`, or `:actions`
- **THEN** prompt text, cursor position, mode, visual selection, search highlights, registers, marks, macro slots, and dot-repeat state remain unchanged except for the transient diagnostic message

#### Scenario: Diagnostic command from visual Ex mode preserves selection

- **WHEN** Ex command-line mode was opened from a visual selection and the user executes a diagnostic command
- **THEN** the command exits Ex mode without editing prompt text and restores the original visual mode state according to existing Ex cancellation behavior

### Requirement: Action search is discoverable and finite

The Vim editor SHALL expose a searchable list of supported semantic actions without implying support for arbitrary Vim commands.

#### Scenario: Actions command lists supported categories

- **WHEN** the editor executes `:actions` without a query
- **THEN** the editor shows a compact summary of supported action categories such as commands, motions, operators, text objects, macros, marks, searches, and prompt transforms

#### Scenario: Actions command searches metadata

- **WHEN** the editor executes `:actions redo` or another query matching an action id, description, or current binding
- **THEN** the editor shows the best matching supported action and its current binding when one exists

#### Scenario: Actions command rejects unsupported parity claims

- **WHEN** the editor executes `:actions vimscript` or another query that matches no supported finite action
- **THEN** the editor shows a transient no-match message rather than inventing unsupported Vim behavior

### Requirement: Map checking explains keys and conflicts

The Vim editor SHALL explain whether a key or key sequence is mapped, unmapped, protected, conflicting, or unsupported.

#### Scenario: Mapped key is explained

- **WHEN** the editor executes `:mapcheck ctrl+r` and `ctrl+r` resolves to redo in the current normal-mode keymap
- **THEN** the editor shows the matched action, action kind, and current binding

#### Scenario: Protected shortcut is explained

- **WHEN** the editor executes `:mapcheck ctrl+p` or another Pi-owned protected shortcut
- **THEN** the editor shows that the shortcut is protected, names the Pi behavior it preserves when known, and does not treat it as a configurable pi-vimmode binding

#### Scenario: Conflicting configured sequence is explained

- **WHEN** settings contain a keymap conflict that was ignored during resolution and the editor executes `:mapcheck` for the conflicting sequence
- **THEN** the editor shows that the sequence was rejected or ignored because of the conflict and identifies at least one conflicting action when known

### Requirement: Optional no-op feedback is scoped and quiet by default

The Vim editor SHALL support optional feedback for confusing no-op inputs while preserving quiet default modal editing.

#### Scenario: No-op feedback defaults to off

- **WHEN** no no-op feedback setting is enabled and the user presses an unmapped normal-mode key
- **THEN** the editor preserves existing quiet no-op behavior and does not show a new transient feedback message

#### Scenario: Enabled feedback explains protected delegation

- **WHEN** no-op feedback is enabled and the user presses a protected Pi shortcut in normal mode
- **THEN** the editor delegates or handles the shortcut according to existing ownership rules and shows a transient explanation when the shortcut is not owned by pi-vimmode

#### Scenario: Enabled feedback avoids message floods

- **WHEN** no-op feedback is enabled and repeated invalid or unmapped inputs occur
- **THEN** the editor keeps feedback bounded to transient single messages and does not accumulate a multi-line log

### Requirement: Inspect and message diagnostics are effective-runtime views

Runtime diagnostics SHALL report the effective editor state and configuration available to the current prompt editor rather than raw settings tables or stale implementation defaults.

#### Scenario: Inspect reflects resolved feature availability

- **WHEN** `:vimmode inspect` runs with a preset or resolved options that disable macros, marks, prompt transforms, search highlights, or status items
- **THEN** the diagnostic reflects the effective enabled/disabled state instead of advertising unavailable actions as active behavior

#### Scenario: Messages reflects retained runtime events

- **WHEN** `:messages` runs after diagnostics, Ex errors, Ex successes, or enabled no-op feedback have occurred in the current editor session
- **THEN** it reports retained runtime message events rather than rereading settings files or reconstructing messages from raw config

#### Scenario: Diagnostics include existing warnings when relevant

- **WHEN** retained settings diagnostics contain invalid fields, protected key warnings, or keymap conflicts and the user runs `:vimmode inspect`
- **THEN** the inspect output includes a bounded warning summary without replacing `:vimdoctor` as the detailed customization health command

### Requirement: Inspect and message diagnostics preserve customization state boundaries

Inspectability diagnostics SHALL follow the same read-only state boundaries as existing customization diagnostics.

#### Scenario: Inspect does not mutate effective keymaps or options

- **WHEN** the user executes `:vimmode inspect`
- **THEN** resolved options, effective keymaps, feature enablement, protected shortcut handling, and retained diagnostics remain unchanged

#### Scenario: Messages does not mutate effective keymaps or options

- **WHEN** the user executes `:messages`
- **THEN** resolved options, effective keymaps, feature enablement, protected shortcut handling, and retained diagnostics remain unchanged

#### Scenario: Diagnostic output remains bounded with large state

- **WHEN** prompt text, registers, search history, Ex history, macro slots, marks, or diagnostics are large
- **THEN** `:vimmode inspect` and `:messages` truncate or summarize output so the diagnostic feedback remains bounded and width-safe

### Requirement: Diagnostic command registry remains finite

The customization diagnostic surface SHALL add inspectability commands explicitly rather than turning diagnostics into arbitrary action or command execution.

#### Scenario: Supported diagnostics are explicit

- **WHEN** the user searches or inspects supported diagnostic commands through runtime help or action diagnostics
- **THEN** `vimdoctor`, `keymap`, `mapcheck`, `actions`, `vimmode inspect`, and `messages` are presented as finite supported diagnostics when available

#### Scenario: Unsupported diagnostic names remain unsupported

- **WHEN** the user executes unsupported diagnostic-like commands such as `:map`, `:actionspalette`, `:vimmode dump`, or `:messages clear`
- **THEN** the editor reports a bounded unsupported-command error and leaves prompt editing state unchanged

#### Scenario: Diagnostic docs reject broad parity claims

- **WHEN** user-facing docs describe customization and inspectability diagnostics
- **THEN** they identify the finite command set and do not imply full Vim `:messages`, `:map`, `:verbose`, or Vimscript support

### Requirement: Customization metadata supports runtime feature discovery

The Vim editor SHALL reuse the existing semantic action, keymap, prompt transform, macro, mark, and protected shortcut metadata for broader runtime feature discovery without weakening existing customization diagnostic commands.

#### Scenario: Feature search reuses current action bindings

- **WHEN** the editor executes `:features redo` and the resolved keymap binds redo to `ctrl+r`
- **THEN** the feature result reports redo using the same effective binding vocabulary as `:actions redo` or `:keymap redo`

#### Scenario: Protected shortcut feature search reuses protected catalog

- **WHEN** the editor executes `:features ctrl+p`
- **THEN** the feature result describes the protected Pi shortcut using the same ownership reason and behavior vocabulary as `:mapcheck ctrl+p`

#### Scenario: Customization diagnostics keep their existing scope

- **WHEN** the editor executes `:actions`, `:keymap`, `:mapcheck`, or `:vimdoctor` after runtime help support is added
- **THEN** those commands keep their existing action-focused, keymap-focused, key-checking, and doctor-summary behavior rather than becoming general help or docs browsers

### Requirement: Feature discovery reflects effective customization state

Runtime feature discovery SHALL describe the current editor's effective customization state when a feature area is disabled, renamed, or restricted by resolved pi-vimmode options.

#### Scenario: Disabled prompt transform is reported as disabled

- **WHEN** the editor executes `:features reflow` and the resolved prompt transform options disable the `reflow` action
- **THEN** the feature result reports that `reflow` is disabled for the current editor rather than describing it as an active Ex transform

#### Scenario: Renamed prompt transform command is discoverable

- **WHEN** the editor executes `:features quote` and the resolved prompt transform options rename the quote command
- **THEN** the feature result includes the current command name that users should execute for the quote transform

#### Scenario: Restricted mark slots are reported

- **WHEN** the editor executes `:features marks` and resolved mark options restrict allowed mark slots
- **THEN** the feature result reports that marks are enabled with the current slot limits rather than listing unrestricted mark support

### Requirement: Diagnostics describe prompt transform action keybindings

Runtime customization diagnostics SHALL report canonical prompt transform action IDs, accepted bindings, and rejected action binding warnings without exposing legacy `promptTransform.*` aliases.

#### Scenario: Actions diagnostic shows canonical transform action ID

- **WHEN** the editor executes `:actions reflow` after `prompt.transform.reflow` is available
- **THEN** the diagnostic reports `prompt.transform.reflow` with its current binding state and transform description

#### Scenario: Legacy promptTransform alias no longer matches diagnostics

- **WHEN** the editor executes `:actions promptTransform.reflow` or `:keymap promptTransform.reflow` after the alias transition has ended
- **THEN** the diagnostic reports no match and does not resolve the query to `prompt.transform.reflow`

#### Scenario: Keymap diagnostic lists action keybindings

- **WHEN** the editor executes `:keymap prompt.transform.reflow`
- **THEN** the diagnostic reports accepted keymap action bindings for `prompt.transform.reflow` and prints the canonical action ID exactly

#### Scenario: Mapcheck reports accepted action binding

- **WHEN** `gq` is an accepted binding for `prompt.transform.reflow` and the editor executes `:mapcheck gq`
- **THEN** the diagnostic reports that `gq` maps to `prompt.transform.reflow` without adding a legacy `promptTransform.*` prefix or alias

#### Scenario: Vimdoctor reports action binding warnings

- **WHEN** settings contain rejected action key entries
- **THEN** `:vimdoctor` includes action binding warnings in the retained diagnostics summary

#### Scenario: Features query reports action keybindings

- **WHEN** `gq` is an accepted binding for `prompt.transform.reflow` and the editor executes `:features reflow` or `:features prompt.transform.reflow`
- **THEN** the feature summary includes the reflow enabled state, Ex command names, and a compact action keybinding summary such as `keys=gq`

#### Scenario: Legacy promptTransform alias no longer matches feature discovery

- **WHEN** the editor executes `:features promptTransform.reflow` after the alias transition has ended
- **THEN** feature discovery reports no match and does not resolve the query to `prompt.transform.reflow`

#### Scenario: Diagnostic commands remain read-only

- **WHEN** the editor executes `:actions`, `:keymap`, `:mapcheck`, or `:vimdoctor` for action keybindings
- **THEN** prompt text, cursor position, mode, visual selection, search highlights, registers, marks, macros, and dot-repeat state remain unchanged except for diagnostic messages

### Requirement: Diagnostic help actions have metadata-only registry entries

The Vim editor SHALL expose finite metadata for diagnostic and runtime-help actions without making those actions keybindable or plugin-dispatchable.

#### Scenario: Actions search finds diagnostic metadata

- **WHEN** the editor executes `:actions vimmode.doctor`, `:actions vimmode.actions`, or another supported diagnostic/help action ID
- **THEN** it shows the matching metadata entry with its canonical `vimmode.*` ID, command name, diagnostic/runtime-help classification, and metadata-only or non-bindable status

#### Scenario: Actions summary separates metadata-only diagnostics

- **WHEN** the editor executes `:actions` without a query
- **THEN** diagnostic/help metadata entries are summarized separately from bindable prompt transform actions and are not counted as prompt transforms, motions, operators, text objects, macros, marks, searches, or editing commands

#### Scenario: Unsupported diagnostic action remains unsupported

- **WHEN** the editor executes `:actions vimmode.dump`, `:actions actionspalette`, or another unsupported diagnostic-like action query
- **THEN** it shows a bounded no-match message rather than inventing a command, action, plugin API, or keybinding target

### Requirement: Diagnostic action metadata preserves diagnostic command boundaries

Diagnostic/help action metadata SHALL describe existing finite diagnostics without changing execution or editing side effects.

#### Scenario: Metadata entry points to existing Ex command

- **WHEN** a metadata entry names `vimmode.doctor`, `vimmode.actions`, `vimmode.keymap`, `vimmode.mapcheck`, `vimmode.help`, `vimmode.features`, `vimmode.messages`, or `vimmode.inspect`
- **THEN** the described command is one of the explicit supported diagnostic/runtime-help Ex commands and no additional dispatch path is implied

#### Scenario: Metadata lookup is read-only

- **WHEN** the editor executes `:actions vimmode.help` or another metadata lookup from normal or visual Ex mode
- **THEN** prompt text, cursor position, mode restoration, visual selection, search highlights, registers, marks, macro slots, and dot-repeat state remain unchanged except for the transient diagnostic message and existing message-history rules

#### Scenario: Keymap diagnostics do not treat metadata-only actions as bindable

- **WHEN** the editor explains a metadata-only diagnostic/help action through keymap-oriented diagnostics
- **THEN** it reports that the action is metadata-only or not bindable rather than showing it as an unbound configurable action waiting for a user keybinding

### Requirement: Keybinding discovery popup preserves customization state boundaries

Runtime keybinding discovery popup display, popup-local scrolling, and dismissal SHALL be read-only with respect to prompt editing state and effective customization state.

#### Scenario: Popup display is read-only

- **WHEN** the editor executes `:features keybindings` from normal mode
- **THEN** prompt text, cursor position, mode, search highlights, registers, marks, macro slots, dot-repeat state, resolved options, effective keymaps, and retained diagnostics remain unchanged except for displaying the popup

#### Scenario: Popup from visual Ex restores visual state

- **WHEN** Ex command-line mode was opened from a visual selection and the user executes `:features keybindings`
- **THEN** the command exits Ex mode without editing prompt text and restores the original visual mode state while displaying the popup

#### Scenario: Popup scrolling is read-only

- **WHEN** the keybinding discovery popup is visible and the user scrolls inside it with popup-local controls
- **THEN** only the popup scroll position changes, while prompt text, cursor position, mode, visual selection, search highlights, registers, marks, macro slots, dot-repeat state, resolved options, effective keymaps, retained diagnostics, and retained messages remain unchanged

#### Scenario: Popup dismissal is read-only

- **WHEN** the keybinding discovery popup is visible and the user dismisses it with `Esc` or existing reset behavior
- **THEN** prompt text, cursor position, mode, visual selection, search highlights, registers, marks, macro slots, dot-repeat state, resolved options, effective keymaps, and retained diagnostics remain unchanged except for removing the popup

### Requirement: Keybinding popup reuses customization diagnostics vocabulary

The keybinding discovery popup SHALL describe bindings using the same finite metadata boundaries as existing customization diagnostics.

#### Scenario: Accepted bindings use canonical action IDs

- **WHEN** the popup lists accepted prompt transform action bindings
- **THEN** it prints canonical `prompt.transform.*` IDs exactly and does not use legacy `promptTransform.*` names as bindable config keys

#### Scenario: Metadata-only diagnostic actions remain non-bindable

- **WHEN** the popup explains diagnostic or runtime-help action metadata such as `vimmode.doctor` or `vimmode.features`
- **THEN** it identifies those IDs as metadata-only or non-bindable rather than presenting them as configurable keybinding targets

#### Scenario: Protected shortcuts remain protected

- **WHEN** the popup mentions protected Pi shortcuts or directs users to `:mapcheck <key>`
- **THEN** it preserves the protected shortcut catalog boundary and does not present protected Pi shortcuts as available pi-vimmode bindings

### Requirement: Keybinding catalog describes effective bindings

The Vim editor SHALL provide a source-backed keybinding catalog that describes the current editor's effective resolved keybindings without requiring users to inspect settings files or source code.

#### Scenario: Catalog groups supported binding categories

- **WHEN** the editor displays the keybindings catalog
- **THEN** it lists finite supported categories such as commands, motions, operators, text objects, macros, marks, searches, prompt transform actions, and protected Pi shortcuts when those categories are available

#### Scenario: Catalog reflects configured overrides

- **WHEN** resolved settings change a semantic binding such as `piVimMode.keymap.commands.redo` or accept a prompt transform action binding such as `prompt.transform.reflow`
- **THEN** the keybindings catalog reports the effective configured binding rather than only built-in defaults or raw settings text

#### Scenario: Catalog reflects disabled effective features

- **WHEN** resolved options disable macros, marks, or prompt transforms
- **THEN** the keybindings catalog does not present disabled bindings as active behavior and reports bounded disabled or unavailable state when relevant

#### Scenario: Catalog rows show mode scope

- **WHEN** the editor displays the keybindings catalog
- **THEN** each binding row is rendered as a fixed grid with key, supported mode scope, action ID, and source-backed description

#### Scenario: Ex commands and metadata are not catalog keybindings

- **WHEN** the editor displays the keybindings catalog
- **THEN** it excludes Ex commands and diagnostic/runtime-help metadata IDs because they are not keybindings and are covered by other diagnostic/help commands

#### Scenario: Protected shortcuts remain protected

- **WHEN** the keybindings catalog or detail output mentions Pi-owned shortcuts such as `ctrl+p`, `tab`, or `enter`
- **THEN** it preserves the protected shortcut vocabulary and does not present protected Pi shortcuts as available pi-vimmode bindings

### Requirement: Keybinding detail search is finite and source-backed

The Vim editor SHALL search keybinding catalog metadata across finite supported fields without inventing unsupported Vim mapping behavior.

#### Scenario: Detail search finds action by ID or description

- **WHEN** the editor displays `:keybindings redo` or `:keybindings wordForward`
- **THEN** the popup shows matching action ID, action kind, current key sequence, and source-backed description when a match exists

#### Scenario: Detail search finds key ownership

- **WHEN** the editor displays `:keybindings ctrl+p` or another key sequence query
- **THEN** the popup reports whether the key is mapped, unmapped, protected, rejected by retained diagnostics, or otherwise unsupported using the same vocabulary as customization diagnostics

#### Scenario: Detail search rejects unsupported parity queries

- **WHEN** the editor displays `:keybindings vimscript`, `:keybindings nmap`, or another query with no finite supported match
- **THEN** the popup shows a bounded no-match result rather than inventing Vimscript, recursive mapping, or command-palette behavior

