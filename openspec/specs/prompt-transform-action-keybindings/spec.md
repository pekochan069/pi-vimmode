# prompt-transform-action-keybindings Specification

## Purpose

TBD - created by archiving change typed-action-registry-keybindings. Update Purpose after archive.
## Requirements
### Requirement: Prompt transform actions have canonical registry metadata

The Vim editor SHALL expose a finite typed registry for bindable prompt transform actions using canonical `prompt.transform.*` action IDs.

#### Scenario: Registry contains first milestone transform actions

- **WHEN** the action registry is inspected by config, diagnostics, or tests
- **THEN** it includes canonical entries for quote, unquote, bulletize, fence, indent, dedent, and reflow prompt transforms

#### Scenario: Registry excludes metadata-only diagnostics from bindable actions

- **WHEN** `piVimMode.keymap.actions` is parsed
- **THEN** only bindable prompt transform action IDs are accepted and metadata-only diagnostic IDs such as `vimmode.doctor` are rejected with a warning

#### Scenario: Action IDs are unique

- **WHEN** the registry is validated
- **THEN** no two action entries share the same canonical action ID

### Requirement: Action keybindings resolve through modal grammar

The Vim editor SHALL resolve action keybindings through the same finite normal/visual modal grammar as existing configured commands.

#### Scenario: Normal action key resolves

- **WHEN** `prompt.transform.reflow` is bound to `gq` and the editor is in normal mode
- **THEN** pressing `gq` resolves to a prompt transform action result rather than inserting text or starting a separate resolver path

#### Scenario: Counted action key resolves

- **WHEN** `prompt.transform.quote` is bound to `g>` and the user presses `3g>` in normal mode
- **THEN** the action result includes a count of 3 and targets the current line through the next two prompt lines

#### Scenario: Prefix action key waits deterministically

- **WHEN** an action keybinding uses a multi-key sequence such as `gq`
- **THEN** pressing `g` enters pending state and does not execute the action until the full sequence is received

#### Scenario: Invalid pending action sequence clears safely

- **WHEN** the editor has a pending action sequence prefix and the next key completes no grammar or action binding
- **THEN** pending state clears, prompt text remains unchanged, and insert-mode text is not produced

#### Scenario: Action keybinding is not an operator target

- **WHEN** an operator is pending and the next keys would match an action keybinding if no operator were pending
- **THEN** the action does not execute as a motion or text object target and prompt text remains unchanged

#### Scenario: Action keybinding is not register-addressed

- **WHEN** a register prefix is pending and the next keys would match an action keybinding if no register prefix were pending
- **THEN** the action does not execute, registers remain unchanged, and prompt text remains unchanged

### Requirement: Keybound prompt transforms preserve modal side effects

Keybound prompt transform actions SHALL edit prompt text only through existing prompt transform edit behavior and SHALL preserve unrelated modal state.

#### Scenario: Action transform is not dot-repeatable in first milestone

- **WHEN** a keybound prompt transform edits text and the user presses `.` afterward
- **THEN** the action transform is not replayed by dot-repeat in the first milestone

#### Scenario: Action transform preserves registers and marks

- **WHEN** a keybound prompt transform edits a prompt range
- **THEN** registers and marks are not modified except for existing cursor clamping caused by the text edit

#### Scenario: Macro records and replays action keys

- **WHEN** macro recording is active and the user invokes an accepted action keybinding
- **THEN** the macro records the key sequence input and replay resolves that key sequence through the current keymap

#### Scenario: Changed action transform clears visible search highlights

- **WHEN** a keybound prompt transform changes prompt text while prompt search highlights are visible
- **THEN** visible prompt search highlights clear and repeat-search history remains available for `n` and `N`

#### Scenario: Successful action transform is silent

- **WHEN** a keybound prompt transform successfully changes prompt text
- **THEN** no retained success message is added and diagnostics message history is unchanged by the success

#### Scenario: Unchanged action transform reports no-op feedback

- **WHEN** a keybound prompt transform applies successfully but produces no text change
- **THEN** prompt text remains unchanged and no-op feedback follows the resolved feedback settings

#### Scenario: Failed action transform reports error

- **WHEN** a keybound prompt transform cannot apply to the target range
- **THEN** prompt text remains unchanged and a runtime error message is shown

#### Scenario: Insert mode remains Pi-owned

- **WHEN** the editor is in insert mode and a key sequence matches a configured action binding
- **THEN** input delegates to Pi/default insert behavior rather than invoking the action

### Requirement: Metadata-only diagnostic actions are excluded from keybinding config

The Vim editor SHALL keep diagnostic/help action metadata separate from the bindable prompt transform action registry used by `piVimMode.keymap.actions`.

#### Scenario: Diagnostic action ID is rejected in keymap actions config

- **WHEN** settings configure `piVimMode.keymap.actions` with a metadata-only diagnostic/help ID such as `vimmode.doctor`, `vimmode.actions`, `vimmode.help`, or `vimmode.features`
- **THEN** the setting is rejected with a warning, no keybinding dispatch is installed for that ID, and valid sibling `prompt.transform.*` bindings are preserved

#### Scenario: Diagnostic action key sequence does not dispatch

- **WHEN** a metadata-only diagnostic/help ID appears in source-backed discovery metadata
- **THEN** pressing any user-configured key sequence cannot execute that diagnostic/help action unless a future capability explicitly adds a supported binding surface

#### Scenario: Bindable action ID set remains prompt-transform-only

- **WHEN** config validation, command resolution, or tests enumerate accepted bindable action IDs
- **THEN** the accepted set contains only canonical `prompt.transform.*` IDs for supported prompt transforms and excludes `vimmode.*` diagnostic/help metadata IDs

### Requirement: Legacy promptTransform aliases remain diagnostics-only during transition

The Vim editor SHALL preserve legacy `promptTransform.*` aliases for diagnostic/search compatibility until the planned one-release-cycle transition ends, while rejecting those aliases from keybinding config.

#### Scenario: Legacy alias remains searchable

- **WHEN** the editor executes `:actions promptTransform.reflow` or `:features promptTransform.reflow` during the transition release
- **THEN** the diagnostic resolves the alias to canonical `prompt.transform.reflow` output

#### Scenario: Legacy alias is rejected in config

- **WHEN** settings configure `piVimMode.keymap.actions` with a legacy ID such as `promptTransform.reflow`
- **THEN** the entry is rejected with a warning that names the canonical `prompt.transform.reflow` ID and accepted sibling bindings remain active

#### Scenario: Alias transition is covered by validation

- **WHEN** automated docs/source drift validation runs during the transition release
- **THEN** it verifies that docs mention the temporary `promptTransform.*` diagnostic alias behavior and that tests cover canonical output for legacy alias queries

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

### Requirement: Action keybinding presets are recipe-backed and opt-in

The Vim editor SHALL expose named action keybinding presets that are backed by the existing curated prompt transform action keybinding recipes, use canonical `prompt.transform.*` action IDs, and create no default bindings.

#### Scenario: Preset registry uses canonical bindable action IDs

- **WHEN** action keybinding preset metadata is inspected by config, docs, runtime help, or tests
- **THEN** every preset binding references a canonical bindable `prompt.transform.*` action ID and no metadata-only `vimmode.*` or legacy `promptTransform.*` ID

#### Scenario: Paragraph editing preset matches paragraph recipe

- **WHEN** the `paragraph-editing` preset is resolved or documented
- **THEN** it provides the same `gq`, `g>`, and `g<` action bindings as the paragraph editing recipe

#### Scenario: Markdown wrapping preset matches Markdown recipe

- **WHEN** the `markdown-wrapping` preset is resolved or documented
- **THEN** it provides the same fence, quote, and unquote action bindings as the Markdown wrapping recipe

#### Scenario: Preset bindings execute like explicit action bindings

- **WHEN** a user invokes a prompt transform action keybinding that came from an action preset
- **THEN** modal dispatch, counts, visual range handling, macro recording, registers, marks, dot-repeat behavior, search highlight clearing, feedback, and insert-mode Pi delegation match the same binding configured explicitly through `piVimMode.keymap.actions`

#### Scenario: Presets do not add prompt transform semantics

- **WHEN** action keybinding presets are added
- **THEN** the supported prompt transform action set, action args, target range behavior, and text edit semantics remain those of the existing bindable prompt transform actions

#### Scenario: Presets remain opt-in examples, not plugin API

- **WHEN** user-facing docs or runtime help describe action keybinding presets
- **THEN** they identify presets as finite built-in opt-in bundles and do not imply recursive mappings, arbitrary user actions, diagnostic/help action dispatch, or a generic plugin API

