# vim-keymap-configuration Specification

## Purpose

TBD - created by archiving change make-vimmode-configurable. Update Purpose after archive.

## Requirements

### Requirement: Semantic keymap configuration resolves supported Vim actions

The Vim editor SHALL read `piVimMode.keymap` as a semantic mapping for supported operators, motions, and commands while preserving the existing default keymap when no keymap config is provided.

#### Scenario: Default keymap preserved

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds the currently documented normal, visual, operator, motion, paste, open-line, join, and undo commands to their existing default keys

#### Scenario: Operator binding configured

- **WHEN** `piVimMode.keymap.operators.delete` is set to a valid key sequence and the editor is in normal mode
- **THEN** that key sequence starts the delete operator instead of requiring the default `d` key

#### Scenario: Motion binding configured

- **WHEN** `piVimMode.keymap.motions.wordForward` is set to a valid key sequence and the editor is in normal or visual mode
- **THEN** that key sequence performs the configured word-forward motion where word-forward is supported

#### Scenario: Command binding configured

- **WHEN** `piVimMode.keymap.commands.openLineBelow` is set to a valid key sequence and the editor is in normal mode
- **THEN** that key sequence inserts a blank line below the current line and enters insert mode

#### Scenario: Invalid keymap field falls back

- **WHEN** a `piVimMode.keymap` field has an unsupported type, protected key, or invalid action name
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

### Requirement: Operator-motion matrix is configurable

The Vim editor SHALL use `piVimMode.keymap.operatorMotions` to determine which configured motions are valid after each configured operator.

#### Scenario: Configured operator-motion combination executes

- **WHEN** `delete` is bound to a configured operator key and `wordForward` is included in `piVimMode.keymap.operatorMotions.delete`
- **THEN** pressing the delete operator followed by the configured `wordForward` motion deletes that text range and stores it in the unnamed character register

#### Scenario: Configured operator-motion combination is disabled

- **WHEN** a motion action is omitted from `piVimMode.keymap.operatorMotions.change`
- **THEN** pressing the configured change operator followed by that motion clears the pending operator, leaves prompt text unchanged, and does not insert the motion key as text

#### Scenario: Default operator-motion matrix preserved

- **WHEN** no `piVimMode.keymap.operatorMotions` setting is configured
- **THEN** `delete`, `change`, and `yank` support the default `wordForward`, `wordBackward`, `lineStart`, `firstNonBlank`, and `lineEnd` motion actions

### Requirement: Key sequence matching is finite and deterministic

The Vim editor SHALL resolve configured key sequences with a finite matcher that supports single-key and multi-key sequences without recursive mappings or timeout behavior.

#### Scenario: Multi-key sequence resolves

- **WHEN** a supported action is configured with a multi-key sequence such as `gg`
- **THEN** the editor records the first key as a pending prefix and executes the action only after the full sequence is received

#### Scenario: Pending sequence invalidates safely

- **WHEN** the editor has a pending configured sequence prefix and the next printable key does not complete any configured sequence
- **THEN** the pending sequence clears, prompt text remains unchanged, and the unmatched printable key is not inserted

#### Scenario: Conflicting mapping is deterministic

- **WHEN** two actions are configured with the same key sequence in the same mode context
- **THEN** the extension keeps a deterministic resolved action, records a warning for the conflict, and does not fail session startup

### Requirement: Pi-owned shortcuts remain protected

The Vim keymap configuration MUST NOT steal Pi app-owned shortcuts by default.

#### Scenario: Protected key binding ignored

- **WHEN** `piVimMode.keymap` attempts to bind a protected key such as submit, interrupt, external editor, model selection, thinking controls, image paste, or autocomplete control
- **THEN** the binding is ignored or rejected with a warning and the key continues to delegate to Pi behavior

#### Scenario: Insert mode remains Pi-owned

- **WHEN** the editor is in insert mode and the user presses ordinary text input, autocomplete keys, submit, or Pi app shortcuts
- **THEN** input is delegated to Pi's default editor behavior regardless of normal-mode keymap configuration

### Requirement: Keymap configuration is documented and validated

The change SHALL include automated validation and user documentation for keymap configuration.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default keymap resolution, configured operators, configured motions, configured commands, operator-motion matrices, protected keys, invalid config fallback, multi-key sequences, and conflicts

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: Settings reference documents keymap config

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap`, supported semantic actions, default mappings, protected shortcut behavior, and non-goals such as recursive mappings and full Vimscript support

### Requirement: Roadmap keybindings participate in semantic keymap configuration

The Vim editor SHALL expose newly supported roadmap keybindings through the semantic keymap model when the action can be represented as a finite key sequence or command prefix without recursive mappings or timeout behavior.

#### Scenario: Default roadmap keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds the newly supported roadmap actions to their documented default Vim keys

#### Scenario: Word-end motion can be configured

- **WHEN** `piVimMode.keymap.motions` configures the semantic word-end motion to a valid key sequence
- **THEN** that key sequence performs word-end movement in normal and visual contexts where word-end movement is supported

#### Scenario: Word-end operator motion can be configured

- **WHEN** the semantic word-end motion is included in `piVimMode.keymap.operatorMotions.delete`
- **THEN** the resolved delete operator followed by the configured word-end motion deletes the addressed range

#### Scenario: Roadmap commands can be configured where finite

- **WHEN** `piVimMode.keymap.commands` configures a newly supported finite command or command prefix to a valid key sequence
- **THEN** that key sequence invokes the corresponding command in supported normal-mode contexts

#### Scenario: Text-object operator targets remain deterministic

- **WHEN** a user configures operator, motion, command, macro, mark, or roadmap key sequences
- **THEN** pending operator and text-object target resolution remains finite, deterministic, and safe on invalid input

### Requirement: Explicit control-key ownership is limited

The Vim keymap configuration SHALL continue protecting Pi-owned shortcuts while allowing the extension to explicitly own `Ctrl+A` and `Ctrl+X` for normal-mode numeric adjustment.

#### Scenario: Numeric adjustment controls are handled by Vim mode

- **WHEN** the editor is in normal mode and the user presses `Ctrl+A` or `Ctrl+X` with default keymap settings
- **THEN** the Vim editor treats the input as numeric adjustment rather than delegating it to Pi

#### Scenario: Insert mode remains Pi-owned for control shortcuts

- **WHEN** the editor is in insert mode and the user presses `Ctrl+A`, `Ctrl+X`, or another Pi control shortcut
- **THEN** input delegates to Pi default editor behavior unless that insert-mode shortcut is explicitly supported by pi-vimmode

#### Scenario: Other protected shortcuts remain protected

- **WHEN** `piVimMode.keymap` attempts to bind a protected Pi shortcut that pi-vimmode does not explicitly own
- **THEN** the binding is ignored or rejected with a warning and that shortcut continues to delegate to Pi behavior

### Requirement: Roadmap keymap configuration is documented and validated

The change SHALL include tests and documentation for configurable roadmap keybindings and protected shortcut behavior.

#### Scenario: Config validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default roadmap keymap resolution, configurable word-end motion, configurable finite roadmap commands, operator-motion matrix integration, invalid input safety, and protected shortcut handling

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: Canonical docs document configurable roadmap actions

- **WHEN** the user opens `docs/features.md` and `docs/settings.md`
- **THEN** they document which roadmap keybindings are configurable, which remain fixed or deferred, and how `Ctrl+A` / `Ctrl+X` interact with protected Pi shortcuts

### Requirement: Ex command-line entry is configurable

The Vim keymap configuration SHALL expose Ex command-line entry as a semantic normal/visual command while preserving the default `:` binding.

#### Scenario: Default Ex command-line key is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode
- **THEN** pressing `:` enters Ex command-line mode

#### Scenario: Configured Ex command-line key is used

- **WHEN** `piVimMode.keymap.commands.startExCommand` is set to a valid key sequence and the editor is in normal mode
- **THEN** that key sequence enters Ex command-line mode instead of requiring the default `:` key

#### Scenario: Ex command-line key works from visual modes

- **WHEN** `piVimMode.keymap.commands.startExCommand` is set to a valid key sequence and the editor is in a visual mode with an active selection
- **THEN** that key sequence enters Ex command-line mode with the visual range marker prefilled

#### Scenario: Insert mode remains Pi-owned for Ex entry key

- **WHEN** the editor is in insert mode and the user presses `:` or a configured Ex command-line key
- **THEN** input delegates to Pi default editor behavior unless that insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Protected key binding is rejected for Ex command-line entry

- **WHEN** `piVimMode.keymap.commands.startExCommand` attempts to bind a protected Pi-owned shortcut
- **THEN** the binding is ignored or rejected with a warning and the protected shortcut continues to delegate to Pi behavior

#### Scenario: Count before Ex command-line key prefills range

- **WHEN** the editor is in normal mode with a pending numeric count and receives the resolved Ex command-line entry key
- **THEN** Ex command-line mode opens with a concrete clamped numeric range derived from the current prompt line and count

### Requirement: Shift operators participate in semantic keymap configuration

The Vim editor SHALL expose line-only shift operators through the semantic keymap model while preserving the default Vim keys.

#### Scenario: Default shift operator keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds `indent` to `>` and `dedent` to `<`

#### Scenario: Configured indent operator works in normal mode

- **WHEN** `piVimMode.keymap.operators.indent` is set to a valid key sequence and the editor is in normal mode
- **THEN** pressing that key sequence twice indents the current prompt line instead of requiring the default `>>` keys

#### Scenario: Configured dedent operator works in visual mode

- **WHEN** `piVimMode.keymap.operators.dedent` is set to a valid key sequence and the editor is in a visual mode with an active selection
- **THEN** pressing that key sequence dedents all prompt lines touched by the selection instead of requiring the default `<` key

#### Scenario: Invalid shift operator binding falls back safely

- **WHEN** `piVimMode.keymap.operators.indent` or `piVimMode.keymap.operators.dedent` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

### Requirement: Shift operators remain line-only under keymap configuration

The Vim editor SHALL NOT treat shift operators as configurable motion, search, text-object, or mark operators until range-shift semantics are explicitly specified.

#### Scenario: Shift operator motion configuration is rejected

- **WHEN** `piVimMode.keymap.operatorMotions.indent` or `piVimMode.keymap.operatorMotions.dedent` is configured
- **THEN** the unsupported operator-motion field is ignored with a warning and configured delete/change/yank operator-motion fields remain usable

#### Scenario: Configured shift operator motion remains unsupported

- **WHEN** the indent or dedent operator has a configured key sequence and the user presses that operator followed by a configured motion key
- **THEN** the pending operator clears, prompt text is unchanged, registers are unchanged, and the motion key is not inserted into the prompt

#### Scenario: Settings reference documents line-only shift operators

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.operators.indent`, `piVimMode.keymap.operators.dedent`, their defaults, and the fact that `operatorMotions` applies only to motion-capable delete/change/yank operators

### Requirement: Redo command participates in semantic keymap configuration

The Vim editor SHALL expose redo as a finite semantic command in `piVimMode.keymap.commands` while preserving the default Vim redo binding.

#### Scenario: Default redo keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode with redo state available
- **THEN** pressing `Ctrl+R` invokes redo

#### Scenario: Configured redo command is used

- **WHEN** `piVimMode.keymap.commands.redo` is set to a valid key sequence and the editor is in normal mode with redo state available
- **THEN** pressing that configured key sequence invokes redo instead of requiring the default `Ctrl+R` key

#### Scenario: Invalid redo binding falls back safely

- **WHEN** `piVimMode.keymap.commands.redo` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

#### Scenario: Redo configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that include `commands.redo`
- **THEN** the editor uses the resolved redo binding without dropping other command, motion, operator, macro, mark, search, or UI options

### Requirement: Explicit control-key ownership includes normal-mode redo

The Vim keymap configuration SHALL continue protecting Pi-owned shortcuts while allowing the extension to explicitly own `Ctrl+R` for normal-mode redo.

#### Scenario: Normal mode redo control is handled by Vim mode

- **WHEN** the editor is in normal mode and the user presses `Ctrl+R` with default keymap settings
- **THEN** the Vim editor treats the input as redo rather than delegating it to Pi

#### Scenario: Insert mode remains Pi-owned for redo control

- **WHEN** the editor is in insert mode and the user presses `Ctrl+R`
- **THEN** input delegates to Pi default editor behavior unless insert-mode `Ctrl+R` is explicitly supported by pi-vimmode in a future change

#### Scenario: Other protected shortcuts remain protected

- **WHEN** `piVimMode.keymap` attempts to bind a protected Pi shortcut that pi-vimmode does not explicitly own
- **THEN** the binding is ignored or rejected with a warning and that shortcut continues to delegate to Pi behavior

### Requirement: Redo keymap documentation is updated and validated

The change SHALL include tests and settings documentation for configurable redo behavior and shortcut ownership.

#### Scenario: Config validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default redo keymap resolution, configured redo command execution, invalid redo binding fallback, live editor option propagation, and protected shortcut handling

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: Settings reference documents redo command

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.commands.redo`, the default `ctrl+r` binding, and normal-mode shortcut ownership

### Requirement: Backward search entry participates in semantic keymap configuration

The Vim keymap configuration SHALL expose backward prompt search entry as a finite semantic command while preserving the default `?` binding.

#### Scenario: Default backward search keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode
- **THEN** pressing `?` enters backward prompt search workbench mode

#### Scenario: Configured backward search key is used

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` is set to a valid key sequence and the editor is in normal mode
- **THEN** that key sequence enters backward prompt search workbench mode instead of requiring the default `?` key

#### Scenario: Configured backward search works from visual modes

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` is set to a valid key sequence and the editor is in a visual mode with an active selection
- **THEN** that key sequence enters backward prompt search workbench mode and a completed matching search extends the active visual selection

#### Scenario: Configured backward search works after operators

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` is set to a valid key sequence and the editor has a pending delete, change, or yank operator
- **THEN** that key sequence starts backward search as an operator motion target

#### Scenario: Insert mode remains Pi-owned for backward search key

- **WHEN** the editor is in insert mode and the user presses `?` or a configured backward search key
- **THEN** input delegates to Pi default editor behavior unless that insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Invalid backward search binding falls back safely

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

#### Scenario: Backward search configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that include `commands.startSearchBackward`
- **THEN** the editor uses the resolved backward search binding without dropping other command, motion, operator, macro, mark, search, UI, or prompt-transform options

### Requirement: Workbench history controls remain finite and non-recursive

The Vim keymap configuration SHALL NOT introduce recursive mappings, timeout behavior, or Pi-owned shortcut capture for workbench history navigation.

#### Scenario: Workbench history controls are active only while workbench input is pending

- **WHEN** the user presses a resolved workbench history navigation key while no search or Ex workbench input is pending
- **THEN** the key follows the existing normal, visual, insert, or Pi-delegated behavior for the current mode

#### Scenario: Protected shortcuts remain protected outside explicit ownership

- **WHEN** `piVimMode.keymap` attempts to bind a protected Pi shortcut that pi-vimmode does not explicitly own for normal-mode Vim behavior
- **THEN** the binding is ignored or rejected with a warning and that shortcut continues to delegate to Pi behavior

#### Scenario: Regex mode syntax is not a keymap action

- **WHEN** the user configures keymap commands, motions, operators, macros, marks, or text objects
- **THEN** regex opt-in remains controlled by the documented search prefix and Ex substitution flag rather than recursive or expression-based key mappings

### Requirement: Backward search keymap documentation is updated and validated

The change SHALL include tests and settings documentation for configurable backward search behavior and finite workbench controls.

#### Scenario: Config validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default backward search keymap resolution, configured backward search command execution, visual/operator contexts, invalid binding fallback, live editor option propagation, and protected shortcut handling

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: Settings reference documents backward search command

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.commands.startSearchBackward`, the default `?` binding, insert-mode delegation, and finite non-recursive workbench history behavior

### Requirement: Keymap introspection uses resolved semantic bindings

The Vim editor SHALL expose the resolved semantic keymap to diagnostic helpers so users can inspect the effective bindings after defaults, presets, global settings, project settings, and valid overrides are applied.

#### Scenario: Default binding is reported

- **WHEN** Pi starts with no `piVimMode.keymap` customization and the editor executes `:keymap redo`
- **THEN** the editor reports the default redo binding from the resolved normal-mode keymap

#### Scenario: Configured binding is reported

- **WHEN** `piVimMode.keymap.commands.redo` is set to a valid non-conflicting key sequence and the editor executes `:keymap redo`
- **THEN** the editor reports the configured binding instead of only the built-in default

#### Scenario: Ignored invalid binding does not appear effective

- **WHEN** a configured keymap field is ignored because it is unsupported, protected, or conflicting and the editor executes `:keymap` for that action
- **THEN** the editor reports the effective fallback binding and the ignored field remains visible through diagnostics such as `:vimdoctor` or `:mapcheck` when warning details are available

### Requirement: Protected Pi shortcuts have explainable ownership

The keymap configuration SHALL retain an authoritative protected shortcut catalog that is used by validation, runtime delegation, diagnostics, and documentation.

#### Scenario: Protected key warning includes a reason

- **WHEN** `piVimMode.keymap` attempts to bind a Pi-owned protected shortcut such as `ctrl+p`
- **THEN** the binding is ignored or rejected with a warning that identifies the key as protected and preserves valid sibling keymap fields

#### Scenario: Mapcheck explains protected shortcut behavior

- **WHEN** the editor executes `:mapcheck ctrl+p`
- **THEN** the editor reports that `ctrl+p` is protected for Pi behavior and is not available as a pi-vimmode keymap binding

#### Scenario: Explicitly owned control shortcut remains configurable

- **WHEN** a shortcut is explicitly owned by pi-vimmode in normal mode, such as normal-mode redo on `ctrl+r`
- **THEN** keymap validation does not reject that shortcut solely because it is a control-key sequence

#### Scenario: Insert mode Pi shortcut behavior is preserved

- **WHEN** the editor is in insert mode and the user presses a Pi-owned shortcut that pi-vimmode does not explicitly support in insert mode
- **THEN** the shortcut delegates to Pi behavior according to existing protected shortcut rules

### Requirement: Customization presets resolve safely

The Vim editor SHALL support curated customization presets as typed option baselines that compose with explicit field-level settings.

#### Scenario: Valid preset applies baseline options

- **WHEN** `piVimMode.preset` is set to `minimal`, `prompt-safe`, or `vim-heavy`
- **THEN** settings resolution applies the selected preset baseline before explicit fields from the same settings object

#### Scenario: Explicit fields override preset fields

- **WHEN** a preset sets a keymap, UI, feedback, startup, or cursor option and the same settings object provides an explicit valid value for that field
- **THEN** the explicit value wins while unrelated preset fields remain applied

#### Scenario: Project preset overrides global preset field-by-field

- **WHEN** global settings select one preset and project settings select another preset or explicit sibling fields
- **THEN** project settings override global settings according to existing field-by-field precedence without discarding valid global fields that are not overridden

#### Scenario: Invalid preset falls back safely

- **WHEN** `piVimMode.preset` contains an unsupported value
- **THEN** settings resolution records a warning, ignores the invalid preset, preserves valid sibling fields, and constructs a live editor with valid resolved options

#### Scenario: Presets avoid protected Pi shortcuts

- **WHEN** any built-in preset is resolved
- **THEN** the resulting keymap does not bind Pi-owned protected shortcuts unless pi-vimmode explicitly owns that shortcut for the relevant mode

### Requirement: Action keymap configuration binds finite prompt transform actions

The Vim editor SHALL support `piVimMode.keymap.actions` as an additive semantic keymap group for finite bindable prompt transform actions.

#### Scenario: No action keybindings by default

- **WHEN** the editor resolves default options without explicit `piVimMode.keymap.actions`
- **THEN** no prompt transform action keybindings are accepted by default

#### Scenario: String action binding is accepted

- **WHEN** settings configure `piVimMode.keymap.actions` with `{ "prompt.transform.reflow": ["gq"] }`
- **THEN** the resolved keymap accepts `gq` as a binding for `prompt.transform.reflow` with default args

#### Scenario: Object action binding with args is accepted

- **WHEN** settings configure `piVimMode.keymap.actions` with `{ "prompt.transform.fence": [{ "key": "gT", "args": { "language": "ts" } }] }`
- **THEN** the resolved keymap accepts `gT` with the `language` arg attached to that binding

#### Scenario: Object action binding without args is accepted

- **WHEN** settings configure `piVimMode.keymap.actions` with `{ "prompt.transform.reflow": [{ "key": "gq" }] }`
- **THEN** the resolved keymap accepts `gq` as a binding for `prompt.transform.reflow` with default args

#### Scenario: Unknown action ID is ignored

- **WHEN** settings configure an unsupported action ID under `piVimMode.keymap.actions`
- **THEN** that entry is ignored, a warning is recorded, and sibling action bindings remain usable

#### Scenario: Legacy-style action ID is rejected as unsupported

- **WHEN** settings configure a legacy-style action ID such as `promptTransform.reflow` under `piVimMode.keymap.actions`
- **THEN** that entry is ignored as an unsupported action ID, no keybinding dispatch is installed for it, and valid sibling canonical bindings remain usable

#### Scenario: Invalid action args are ignored per binding

- **WHEN** settings configure `{ "prompt.transform.reflow": ["gq", { "key": "gQ", "args": { "width": "wide" } }] }`
- **THEN** the invalid `gQ` binding entry is ignored, a warning is recorded, and the valid `gq` binding remains usable

#### Scenario: Protected action key is rejected

- **WHEN** `piVimMode.keymap.actions` attempts to bind a Pi-owned protected shortcut such as `ctrl+p`
- **THEN** that key entry is rejected with a warning and the shortcut continues to delegate to Pi behavior

#### Scenario: Disabled prompt transform rejects action keybindings

- **WHEN** `piVimMode.promptTransforms.actions.reflow` is false and `piVimMode.keymap.actions` binds `prompt.transform.reflow`
- **THEN** the reflow action key entries are ignored with a warning and `:reflow` remains unsupported

#### Scenario: Disabled prompt transform suite rejects all action keybindings

- **WHEN** `piVimMode.promptTransforms.enabled` is false and `piVimMode.keymap.actions` binds any `prompt.transform.*` action
- **THEN** all prompt transform action key entries are ignored with warnings and prompt transform Ex commands remain unsupported

#### Scenario: Project action bindings replace global bindings per action ID

- **WHEN** global settings bind an action and project settings configure the same action ID with a different binding list
- **THEN** the project binding list replaces the global list for that action ID before conflict resolution

#### Scenario: Empty action binding list unbinds scoped action

- **WHEN** project settings configure an action ID as an empty array
- **THEN** the resolved keymap has no accepted bindings for that action from the replaced scope

### Requirement: Action binding conflicts are rejected before dispatch

The Vim editor SHALL precompute accepted action bindings and diagnostics warnings for rejected entries so rejected action keys never dispatch at runtime.

#### Scenario: Action conflicts with existing grammar binding

- **WHEN** an action binding uses a key sequence already claimed by a resolved operator, motion, command, macro, mark, or text-object grammar binding
- **THEN** that action key entry is rejected with a warning, the existing grammar binding keeps its behavior, and the action can use that key only after the existing binding is explicitly unbound

#### Scenario: Action prefix would shadow existing grammar

- **WHEN** an action binding is a strict prefix of an existing grammar sequence, or an existing executable grammar sequence is a strict prefix of the action binding
- **THEN** that action key entry is rejected with a warning so neither action dispatch nor existing grammar dispatch is shadowed

#### Scenario: Action shares non-executable prefix with existing grammar

- **WHEN** an action binding and an existing grammar binding share a common prefix that is not itself an executable grammar binding, such as `gq` and `gg`
- **THEN** both bindings remain valid and the shared prefix waits for the next key

#### Scenario: Same action repeats the same key

- **WHEN** one action binding list contains the same key sequence more than once
- **THEN** the resolved keymap keeps one accepted binding and does not emit a duplicate warning for that same-action repetition

#### Scenario: Two actions claim the same key

- **WHEN** two different action IDs claim the same key sequence
- **THEN** both conflicting action key entries are rejected and the warning names both action IDs

#### Scenario: Non-conflicting key for same action remains accepted

- **WHEN** one key entry for an action conflicts and another key entry for the same action does not
- **THEN** only the conflicting key entry is rejected and the non-conflicting key entry remains accepted

#### Scenario: Mapcheck can explain rejected action key

- **WHEN** a key sequence was rejected from `piVimMode.keymap.actions` and the user executes `:mapcheck` for that key
- **THEN** the diagnostic reports that the action key was rejected and includes the reason when available

### Requirement: Action keybinding presets resolve to finite action bindings

The Vim editor SHALL support `piVimMode.keymap.actionPresets` as an opt-in array of named built-in action keybinding presets that expand to canonical `piVimMode.keymap.actions` bindings before explicit action entries are resolved.

#### Scenario: No action presets by default

- **WHEN** the editor resolves default options without `piVimMode.keymap.actionPresets` or explicit `piVimMode.keymap.actions`
- **THEN** no prompt transform action keybindings are accepted by default

#### Scenario: Paragraph editing preset applies bindings

- **WHEN** settings configure `piVimMode.keymap.actionPresets` with `["paragraph-editing"]`
- **THEN** the resolved keymap accepts `prompt.transform.reflow` on `gq`, `prompt.transform.quote` on `g>`, and `prompt.transform.unquote` on `g<`

#### Scenario: Markdown wrapping preset applies bindings

- **WHEN** settings configure `piVimMode.keymap.actionPresets` with `["markdown-wrapping"]`
- **THEN** the resolved keymap accepts `prompt.transform.fence` on `gT` with no language arg, `prompt.transform.quote` on `g>`, and `prompt.transform.unquote` on `g<`

#### Scenario: Multiple presets merge in listed order

- **WHEN** settings configure `piVimMode.keymap.actionPresets` with `["paragraph-editing", "markdown-wrapping"]`
- **THEN** the resolved keymap contains the union of compatible preset bindings and later preset bindings replace earlier preset bindings for the same action ID

#### Scenario: Explicit actions override preset actions

- **WHEN** settings configure `piVimMode.keymap.actionPresets` with `["paragraph-editing"]` and also configure `piVimMode.keymap.actions.prompt.transform.quote` with an explicit keybinding entry
- **THEN** the explicit `prompt.transform.quote` entries replace the preset-provided quote entries while unrelated preset bindings remain accepted

#### Scenario: Explicit empty action array clears preset action

- **WHEN** settings configure `piVimMode.keymap.actionPresets` with `["paragraph-editing"]` and explicit `piVimMode.keymap.actions.prompt.transform.quote` as an empty array
- **THEN** the resolved keymap contains no accepted `prompt.transform.quote` binding from that preset and preserves unrelated preset bindings

#### Scenario: Project settings layer overrides global preset layer

- **WHEN** global settings configure an action preset and project settings configure explicit `piVimMode.keymap.actions` for one of the same action IDs
- **THEN** the project explicit action entries override the global preset entries for that action ID while valid unrelated global preset bindings remain available

#### Scenario: Invalid preset names preserve valid siblings

- **WHEN** `piVimMode.keymap.actionPresets` contains a supported preset ID and an unsupported preset ID
- **THEN** settings resolution records a warning for the unsupported preset ID, applies the supported preset ID, and continues resolving valid sibling settings

#### Scenario: Invalid preset shape is ignored safely

- **WHEN** `piVimMode.keymap.actionPresets` is not an array of strings
- **THEN** settings resolution records a warning, ignores the invalid preset value, and continues resolving valid sibling settings

#### Scenario: Preset bindings obey disabled transform validation

- **WHEN** `piVimMode.promptTransforms.actions.reflow` is false and `piVimMode.keymap.actionPresets` includes `paragraph-editing`
- **THEN** the preset-provided `prompt.transform.reflow` binding is rejected with a warning and valid preset bindings for enabled actions remain accepted

#### Scenario: Preset bindings obey keymap conflict validation

- **WHEN** a preset-provided key sequence conflicts with a configured grammar binding or another action binding during resolution
- **THEN** the conflicting preset-provided action binding is rejected with the same warning style as explicit `piVimMode.keymap.actions` entries

### Requirement: Keybindings popup command participates in semantic keymap configuration

The Vim keymap configuration SHALL expose a finite semantic command for opening the keybindings popup while preserving existing protected-shortcut, conflict, and insert-mode delegation rules.

#### Scenario: Keybindings popup command has no default binding

- **WHEN** Pi starts with no `piVimMode.keymap.commands.showKeybindings` setting
- **THEN** no normal-mode key sequence opens the keybindings popup by default and existing default bindings remain unchanged

#### Scenario: Configured keybindings popup command opens popup

- **WHEN** `piVimMode.keymap.commands.showKeybindings` is set to a valid non-conflicting key sequence and the editor is in normal mode
- **THEN** pressing that key sequence opens the same bounded read-only popup as `:keybindings`

#### Scenario: Configured keybindings popup command is read-only

- **WHEN** the configured keybindings popup command opens the popup from normal mode
- **THEN** prompt text, cursor position, registers, marks, macros, search state, resolved options, retained diagnostics, and dot-repeat state remain unchanged except for displaying the popup

#### Scenario: Insert mode remains Pi-owned for configured key

- **WHEN** the editor is in insert mode and the user presses a key sequence configured for `showKeybindings`
- **THEN** input delegates to Pi default editor behavior unless that insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Protected key binding is rejected

- **WHEN** `piVimMode.keymap.commands.showKeybindings` attempts to bind a protected Pi-owned shortcut such as `ctrl+p`, `enter`, or `tab`
- **THEN** the binding is ignored or rejected with a warning and the protected shortcut continues to delegate to Pi behavior

#### Scenario: Conflicting keybinding is rejected

- **WHEN** `piVimMode.keymap.commands.showKeybindings` attempts to use a key sequence that exactly conflicts with or prefix-shadows an existing resolved grammar binding
- **THEN** the invalid binding is ignored or rejected with a warning and the existing grammar binding keeps its behavior

#### Scenario: Live editor uses resolved keybindings popup command

- **WHEN** a live `VimEditor` is constructed with resolved options that include `commands.showKeybindings`
- **THEN** the editor uses that binding without dropping other command, motion, operator, macro, mark, search, UI, or prompt-transform options

### Requirement: Diagnostic metadata remains separate from keymap commands

The keymap configuration SHALL keep the new keybindings popup command separate from metadata-only diagnostic/help action IDs and prompt transform action bindings.

#### Scenario: Metadata IDs are not accepted as action keybindings

- **WHEN** settings configure `piVimMode.keymap.actions` with a metadata ID such as `vimmode.keybindings`, `vimmode.keymap`, or `vimmode.help`
- **THEN** that entry is ignored with a warning and no user keybinding dispatch is created for the metadata ID

#### Scenario: Prompt transform action bindings keep existing scope

- **WHEN** settings configure valid `piVimMode.keymap.actions` entries for `prompt.transform.*` IDs while also configuring `commands.showKeybindings`
- **THEN** prompt transform action bindings continue to dispatch prompt transforms, and `showKeybindings` opens only the keybindings popup

### Requirement: Configured character search commands resolve as operator targets

The Vim keymap configuration SHALL allow configured semantic character-search command bindings to serve as targets after motion-capable operators without adding arbitrary Vim grammar.

#### Scenario: Configured find-forward command works after operator

- **WHEN** `piVimMode.keymap.commands.findCharForward` is configured to a valid key sequence and the editor is in normal mode with a pending delete operator
- **THEN** pressing that configured key sequence followed by a printable target character deletes through the resolved current-line character match

#### Scenario: Configured till-forward command works after configured operator

- **WHEN** `piVimMode.keymap.operators.change` and `piVimMode.keymap.commands.tillCharForward` are configured to valid key sequences
- **THEN** pressing the configured change operator, configured till-forward command, and printable target character removes text up to but not including the resolved target and enters insert mode

#### Scenario: Multi-key character search command resolves deterministically after operator

- **WHEN** a character-search command is configured with a valid multi-key sequence that shares a prefix with another supported binding
- **THEN** the finite key sequence matcher waits for the full configured command sequence before consuming the printable target character

#### Scenario: Configured repeated character search command works after operator

- **WHEN** `piVimMode.keymap.commands.repeatCharSearch` or `piVimMode.keymap.commands.repeatCharSearchReverse` is configured to a valid key sequence and a previous character search exists
- **THEN** pressing a motion-capable operator followed by that configured repeat command applies the operator to the repeated character-search target

#### Scenario: Unsupported command after operator remains invalid

- **WHEN** the editor is in normal mode with a pending delete, change, or yank operator and the user enters a configured command that is not a supported operator target
- **THEN** the pending operator clears, prompt text is unchanged, and the unmatched key sequence is not inserted into the prompt

#### Scenario: Insert mode remains Pi-owned for character search keys

- **WHEN** the editor is in insert mode and the user presses keys configured for `findCharForward`, `findCharBackward`, `tillCharForward`, or `tillCharBackward`
- **THEN** those keys continue to delegate to Pi default editing behavior unless otherwise supported by pi-vimmode insert-mode input

### Requirement: WORD and previous-end motions participate in semantic keymap configuration

The Vim keymap configuration SHALL expose WORD and previous-end word motions as finite semantic motion actions while preserving existing lowercase word motion configuration.

#### Scenario: Default keymap binds WORD and previous-end motions

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds `wordForwardBig` to `W`, `wordBackwardBig` to `B`, `wordEndBig` to `E`, `wordPreviousEnd` to `ge`, and `wordPreviousEndBig` to `gE`

#### Scenario: Configured WORD motion is used

- **WHEN** `piVimMode.keymap.motions.wordForwardBig` is set to a valid finite key sequence and the editor is in normal or visual mode
- **THEN** that key sequence performs whitespace-delimited WORD-forward movement instead of requiring the default `W` key

#### Scenario: Configured previous-end motion is used

- **WHEN** `piVimMode.keymap.motions.wordPreviousEnd` is set to a valid finite key sequence and the editor is in normal mode
- **THEN** that key sequence performs previous word-end movement using the same target semantics as the default `ge` binding

#### Scenario: Configured operator-motion matrix accepts new motions

- **WHEN** `wordForwardBig`, `wordEndBig`, `wordPreviousEnd`, or `wordPreviousEndBig` is included in `piVimMode.keymap.operatorMotions.delete`, `change`, or `yank`
- **THEN** the resolved operator followed by the configured motion applies that operator to the addressed finite range

#### Scenario: Omitted new motion remains disabled for that operator

- **WHEN** a motion-capable operator has an explicit `piVimMode.keymap.operatorMotions` list that omits a WORD or previous-end motion action
- **THEN** pressing that operator followed by the omitted motion clears the pending operator, leaves prompt text unchanged, and does not insert the motion key as text

#### Scenario: New motion configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that include configured WORD or previous-end motion bindings
- **THEN** the editor uses those bindings without dropping other command, motion, operator, macro, mark, search, UI, or prompt-transform options

### Requirement: Built-in keymap metadata remains single-source consistent

The Vim keymap configuration SHALL keep built-in semantic action names, default key sequences, validation allow-lists, command resolver mappings, and diagnostics-facing labels consistent from one typed built-in metadata source while preserving existing `piVimMode.keymap` behavior.

#### Scenario: Default keymap remains equivalent

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap exposes the same default operator, motion, command, macro, mark, text-object, operator-motion, and action bindings as before this change

#### Scenario: Config validation uses the same semantic actions

- **WHEN** `piVimMode.keymap` configures any supported semantic operator, motion, command, macro, mark, text-object, or operator-motion action
- **THEN** settings resolution accepts that action according to the existing field-specific validation rules and preserves valid sibling fields

#### Scenario: Unsupported action still falls back safely

- **WHEN** `piVimMode.keymap` contains an unsupported action name, unsupported key shape, protected shortcut, duplicate binding, or conflicting binding
- **THEN** settings resolution ignores or rejects only the invalid field, records a warning, preserves valid sibling fields, and keeps session startup working

#### Scenario: Command resolver maps match default semantic bindings

- **WHEN** the editor resolves default normal-mode operators, motions, line commands, character-search commands, search commands, macro prefixes, mark prefixes, and text-object prefixes
- **THEN** command parsing returns the same finite semantic results as before this change, including pending-prefix and invalid-key behavior

#### Scenario: Descriptor-derived tables do not add user-visible behavior

- **WHEN** users keep existing global or project settings
- **THEN** no new keybindings, recursive mappings, timeout behavior, Vimscript behavior, or Neovim-specific behavior becomes available as a side effect of the table refactor

### Requirement: Descriptor-derived keymap tables are validated by equivalence tests

The change SHALL include automated tests that prove descriptor-derived keymap data remains equivalent to the existing public keymap contract.

#### Scenario: Automated equivalence validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover descriptor/default keymap equivalence, supported-action validation, unsupported-action fallback, legacy operator and motion map equivalence, command classification equivalence, protected shortcut handling, and conflict diagnostics

#### Scenario: Typecheck validates descriptor coverage

- **WHEN** `bun run check-types` is executed
- **THEN** TypeScript verifies descriptor records cover the public semantic action unions without unsupported action keys

### Requirement: Cached keymap lookups preserve semantic command resolution

The Vim keymap configuration SHALL allow normal-mode command resolution to use cached or compiled lookup data while preserving the existing finite semantic parser contract for resolved keymaps.

#### Scenario: Default keymap resolution remains equivalent

- **WHEN** the editor resolves default normal-mode operators, motions, commands, command prefixes, counts, search commands, character-search commands, text objects, and prompt-transform action bindings
- **THEN** command resolution returns the same semantic results and pending-state behavior as the uncached resolver contract

#### Scenario: Configured keymap resolution remains equivalent

- **WHEN** `piVimMode.keymap` configures supported operators, motions, commands, text-object keys, operator-motion matrices, or prompt-transform action bindings
- **THEN** command resolution uses the active resolved keymap and preserves explicit override precedence, finite multi-key prefixes, invalid-key handling, and accepted action args

#### Scenario: Operator-pending grammar remains scoped

- **WHEN** an operator is pending and the next key could also be part of an unrelated longer top-level key sequence
- **THEN** the resolver interprets the key through operator-pending grammar before generic top-level prefix matching

#### Scenario: Duplicate sequences remain deterministic

- **WHEN** a directly supplied resolved keymap contains the same sequence in multiple resolver groups
- **THEN** command resolution keeps the same deterministic first-match behavior as before this change and does not fail session startup

### Requirement: Compiled keymap cache is scoped to resolved keymap identity

The Vim keymap resolver SHALL scope cached lookup data to each `ResolvedVimKeymap` object identity so different active keymaps do not share stale command bindings.

#### Scenario: Distinct keymaps resolve same sequence differently

- **WHEN** two different resolved keymap objects bind the same key sequence to different supported semantic actions
- **THEN** resolving that sequence against each keymap returns the action for that specific keymap object

#### Scenario: Settings refresh uses new keymap data

- **WHEN** a later settings resolution produces a new resolved keymap object after an earlier keymap has already been used for command resolution
- **THEN** subsequent command resolution uses the later keymap data instead of stale lookup data from the earlier keymap

#### Scenario: Default and custom keymaps can be interleaved

- **WHEN** command resolution alternates between the default keymap and one or more custom resolved keymaps
- **THEN** each call resolves against the keymap provided for that call without cross-keymap contamination

### Requirement: Resolver performance work is validated without user-visible behavior changes

The change SHALL validate resolver performance work with tests and profiling evidence while keeping public keymap behavior unchanged.

#### Scenario: Automated semantic validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover cached resolver equivalence for default commands, configured bindings, prefix precedence, operator motions, operator text objects, operator search, character search, counts, prompt-transform action bindings, invalid pending input, and distinct keymap identities

#### Scenario: Typecheck validates cached lookup types

- **WHEN** `bun run check-types` is executed
- **THEN** TypeScript validates the compiled lookup structures without exposing unsupported public keymap API

#### Scenario: No documentation update is required

- **WHEN** users read `docs/features.md` or `docs/settings.md`
- **THEN** no new keybinding, setting, command syntax, or Vim parity claim is introduced by the cache refactor
