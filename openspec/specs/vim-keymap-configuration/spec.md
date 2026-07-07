# vim-keymap-configuration Specification

## Purpose

TBD - created by archiving change make-vimmode-configurable. Update Purpose after archive.

## Requirements

### Requirement: Semantic keymap configuration resolves supported Vim actions

The Vim editor SHALL read `piVimMode.keymap` as a semantic mapping for supported operators, motions, and commands while preserving the existing default keymap when no keymap config is provided. Directional motion defaults SHALL include physical arrow-key aliases for the same semantic left/down/up/right actions as `h`, `j`, `k`, and `l`.

#### Scenario: Default keymap preserved

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds the currently documented normal, visual, operator, motion, paste, open-line, join, and undo commands to their existing default keys

#### Scenario: Default directional arrow aliases available

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved motion keymap binds `left`, `down`, `up`, and `right` as aliases for the existing left/down/up/right motion actions

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

The Vim editor SHALL use `piVimMode.keymap.operatorMotions` to determine which configured motions are valid after each configured motion-capable operator.

#### Scenario: Configured operator-motion combination executes

- **WHEN** `delete` is bound to a configured operator key and `wordForward` is included in `piVimMode.keymap.operatorMotions.delete`
- **THEN** pressing the delete operator followed by the configured `wordForward` motion deletes that text range and stores it in the unnamed character register

#### Scenario: Configured case operator-motion combination executes

- **WHEN** `lowercase` is bound to a configured operator key and `wordForward` is included in `piVimMode.keymap.operatorMotions.lowercase`
- **THEN** pressing the lowercase operator followed by the configured `wordForward` motion lowercases that text range without writing registers

#### Scenario: Configured operator-motion combination is disabled

- **WHEN** a motion action is omitted from `piVimMode.keymap.operatorMotions.uppercase`
- **THEN** pressing the configured uppercase operator followed by that motion clears the pending operator, leaves prompt text unchanged, and does not insert the motion key as text

#### Scenario: Default operator-motion matrix preserved

- **WHEN** no `piVimMode.keymap.operatorMotions` setting is configured
- **THEN** `delete`, `change`, `yank`, `lowercase`, `uppercase`, and `toggleCase` support the default finite motion actions documented for each operator family

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

#### Scenario: Image paste shortcuts are protected by default

- **WHEN** `piVimMode.keymap.commands.visualBlock` attempts to bind `Ctrl-v`, `Alt-v`, or `Ctrl-Alt-v` without listing that shortcut in the same settings layer's `piVimMode.keymap.allowProtectedOverrides`
- **THEN** the binding is rejected with a warning and the shortcut continues to delegate to Pi image or clipboard paste behavior

#### Scenario: Image paste shortcuts can be explicitly owned for visual block

- **WHEN** `piVimMode.keymap.commands.visualBlock` binds `Ctrl-v`, `Alt-v`, or `Ctrl-Alt-v` and the same settings layer lists that shortcut in `piVimMode.keymap.allowProtectedOverrides`
- **THEN** normal and visual mode use that shortcut for visual block entry or switching through the semantic visualBlock command

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

The Vim keymap configuration SHALL continue protecting Pi-owned shortcuts while allowing the extension to explicitly own `Ctrl+A` and `Ctrl+X` for normal-mode numeric adjustment and `Ctrl+D` and `Ctrl+U` for normal/visual-mode scroll motions.

#### Scenario: Numeric adjustment controls are handled by Vim mode

- **WHEN** the editor is in normal mode and the user presses `Ctrl+A` or `Ctrl+X` with default keymap settings
- **THEN** the Vim editor treats the input as numeric adjustment rather than delegating it to Pi

#### Scenario: Scroll controls are handled by Vim mode

- **WHEN** the editor is in normal or visual mode and the user presses `Ctrl+D` or `Ctrl+U` with default keymap settings
- **THEN** the Vim editor treats the input as prompt-local half-page scroll motion rather than delegating it to Pi

#### Scenario: Insert mode remains Pi-owned for control shortcuts

- **WHEN** the editor is in insert mode and the user presses `Ctrl+A`, `Ctrl+X`, `Ctrl+D`, `Ctrl+U`, or another Pi control shortcut
- **THEN** input delegates to Pi default editor behavior unless that insert-mode shortcut is explicitly supported by pi-vimmode

#### Scenario: Other protected shortcuts remain protected

- **WHEN** `piVimMode.keymap` attempts to bind a protected Pi shortcut that pi-vimmode does not explicitly own
- **THEN** the binding is ignored or rejected with a warning and that shortcut continues to delegate to Pi behavior

### Requirement: Roadmap keymap configuration is documented and validated

The change SHALL include tests and documentation for configurable roadmap keybindings and protected shortcut behavior.

#### Scenario: Config validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default roadmap keymap resolution, configurable word-end motion, configurable finite roadmap commands, configurable case operators, operator-motion matrix integration, invalid input safety, and protected shortcut handling

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the TypeScript project compiles without type errors

#### Scenario: Canonical docs document configurable roadmap actions

- **WHEN** the user opens `docs/features.md` and `docs/settings.md`
- **THEN** they document which roadmap keybindings are configurable, which remain fixed or deferred, how `Ctrl+A` / `Ctrl+X` interact with protected Pi shortcuts, and how case operators participate in semantic keymap configuration

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
- **THEN** the unsupported operator-motion field is ignored with a warning and configured delete, change, yank, and case operator-motion fields remain usable

#### Scenario: Configured shift operator motion remains unsupported

- **WHEN** the indent or dedent operator has a configured key sequence and the user presses that operator followed by a configured motion key
- **THEN** the pending operator clears, prompt text is unchanged, registers are unchanged, and the motion key is not inserted into the prompt

#### Scenario: Settings reference documents line-only shift operators

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.operators.indent`, `piVimMode.keymap.operators.dedent`, their defaults, and the fact that `operatorMotions` excludes line-only shift operators

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

### Requirement: Scroll motions participate in semantic keymap configuration

The Vim editor SHALL expose prompt-local half-page scroll motions through the semantic keymap model while preserving finite deterministic key resolution.

#### Scenario: Default scroll keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal or visual mode
- **THEN** the resolved keymap binds `halfPageDown` to `<C-d>` and `halfPageUp` to `<C-u>`

#### Scenario: Configured scroll motion key is used

- **WHEN** `piVimMode.keymap.motions.halfPageDown` or `piVimMode.keymap.motions.halfPageUp` is set to a valid key sequence
- **THEN** that key sequence performs the matching scroll motion in normal and visual contexts where motions are supported

#### Scenario: Scroll motions are not default operator motions

- **WHEN** no `piVimMode.keymap.operatorMotions` setting is configured
- **THEN** `delete`, `change`, and `yank` do not treat `<C-d>` or `<C-u>` as supported operator-motion targets

#### Scenario: Scroll operator-motion config is safe

- **WHEN** `piVimMode.keymap.operatorMotions` attempts to include `halfPageDown` or `halfPageUp` for `delete`, `change`, or `yank`
- **THEN** the unsupported operator-motion entry is ignored or rejected with a warning and does not corrupt prompt text or registers

#### Scenario: Settings docs document scroll motion configuration

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents the `halfPageDown` and `halfPageUp` motion action names, defaults, and operator-motion limitation

### Requirement: Paragraph motions participate in semantic keymap configuration

The Vim keymap configuration SHALL expose paragraph motions as finite semantic motion actions while preserving default Vim keys and existing keymap validation behavior.

#### Scenario: Default paragraph motion keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal or visual mode
- **THEN** the resolved keymap binds `paragraphBackward` to `{` and `paragraphForward` to `}`

#### Scenario: Configured paragraph motion key is used

- **WHEN** `piVimMode.keymap.motions.paragraphForward` or `piVimMode.keymap.motions.paragraphBackward` is set to a valid finite key sequence
- **THEN** that key sequence performs the matching paragraph motion in normal and visual contexts where motions are supported

#### Scenario: Configured operator-motion matrix accepts paragraph motions

- **WHEN** `paragraphForward` or `paragraphBackward` is included in `piVimMode.keymap.operatorMotions.delete`, `change`, or `yank`
- **THEN** the resolved operator followed by the configured paragraph motion applies that operator to the addressed finite paragraph range

#### Scenario: Omitted paragraph operator motion is disabled safely

- **WHEN** a motion-capable operator has an explicit `piVimMode.keymap.operatorMotions` list that omits `paragraphForward` or `paragraphBackward`
- **THEN** pressing that operator followed by the omitted paragraph motion clears the pending operator, leaves prompt text unchanged, and does not insert the motion key as text

#### Scenario: Paragraph motion configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that include configured paragraph motion bindings
- **THEN** the editor uses those bindings without dropping other command, motion, operator, macro, mark, search, UI, or prompt-transform options

### Requirement: Paragraph text object participates in semantic keymap configuration

The Vim keymap configuration SHALL expose paragraph as a finite text-object target while preserving existing inner and around text-object kind behavior.

#### Scenario: Default paragraph text object target is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode with a pending delete, change, or yank operator followed by `i` or `a`
- **THEN** the resolved keymap binds `textObjects.targets.paragraph` to `p` so `ip` and `ap` target paragraph text objects

#### Scenario: Configured paragraph text object target is used

- **WHEN** `piVimMode.keymap.textObjects.targets.paragraph` is set to a valid finite key sequence
- **THEN** pending operator text-object resolution uses that key sequence as the paragraph target while preserving configured `inner` and `around` kind keys

#### Scenario: Invalid paragraph text object binding falls back safely

- **WHEN** `piVimMode.keymap.textObjects.targets.paragraph` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored or rejected with a warning and sibling keymap fields remain usable

#### Scenario: Paragraph keymap documentation is updated

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `paragraphForward`, `paragraphBackward`, `textObjects.targets.paragraph`, their default keys, and the finite blank-line paragraph scope

#### Scenario: Keybinding discovery lists paragraph bindings

- **WHEN** runtime keybinding discovery shows effective motion and text-object bindings
- **THEN** paragraph motions and paragraph text-object targets appear with descriptions matching their prompt-local behavior

### Requirement: Word-under-cursor search commands participate in semantic keymap configuration

The Vim keymap configuration SHALL expose word-under-cursor prompt search as finite semantic command actions while preserving the default `*` and `#` bindings.

#### Scenario: Default star keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode with the cursor on a keyword word
- **THEN** pressing `*` searches forward for that word using prompt-local word search behavior

#### Scenario: Default hash keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode with the cursor on a keyword word
- **THEN** pressing `#` searches backward for that word using prompt-local word search behavior

#### Scenario: Configured forward word search key is used

- **WHEN** `piVimMode.keymap.commands.searchWordForward` is set to a valid key sequence and the editor is in normal mode with the cursor on a keyword word
- **THEN** that key sequence searches forward for that word instead of requiring the default `*` key

#### Scenario: Configured backward word search key is used

- **WHEN** `piVimMode.keymap.commands.searchWordBackward` is set to a valid key sequence and the editor is in normal mode with the cursor on a keyword word
- **THEN** that key sequence searches backward for that word instead of requiring the default `#` key

#### Scenario: Insert mode remains Pi-owned for word search keys

- **WHEN** the editor is in insert mode and the user presses `*`, `#`, or a configured word search key
- **THEN** input delegates to Pi default editor behavior unless that insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Invalid word search binding falls back safely

- **WHEN** `piVimMode.keymap.commands.searchWordForward` or `piVimMode.keymap.commands.searchWordBackward` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

#### Scenario: Word search configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that include word search command bindings
- **THEN** the editor uses the resolved word search bindings without dropping other command, motion, operator, macro, mark, search, UI, prompt-structure, prompt-transform, or feedback options

### Requirement: Word search keymap documentation is updated and validated

The change SHALL include tests and settings documentation for configurable word-under-cursor search behavior.

#### Scenario: Config validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover default word search keymap resolution, configured word search command execution, invalid binding fallback, live editor option propagation, and insert-mode delegation

#### Scenario: Settings reference documents word search commands

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.commands.searchWordForward`, default `*`, `piVimMode.keymap.commands.searchWordBackward`, default `#`, normal-mode ownership, and insert-mode delegation

### Requirement: Case operators participate in semantic keymap configuration

The Vim editor SHALL expose finite case operators through `piVimMode.keymap.operators` while preserving deterministic prefix resolution for existing `g` bindings.

#### Scenario: Default case operator keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds `lowercase` to `gu`, `uppercase` to `gU`, and `toggleCase` to `g~`

#### Scenario: Configured lowercase operator works

- **WHEN** `piVimMode.keymap.operators.lowercase` is set to a valid finite key sequence and the editor is in normal mode
- **THEN** pressing that configured operator followed by a supported configured motion lowercases the addressed prompt range

#### Scenario: Configured case operator text object works

- **WHEN** `piVimMode.keymap.operators.uppercase` is configured and the editor receives that operator followed by a configured text-object kind and target
- **THEN** the addressed text object is uppercased without changing registers or mode

#### Scenario: Case operators do not capture unsupported target families

- **WHEN** the editor is in normal mode with a pending case operator and the user enters a mark, search, character-search, or unsupported command target
- **THEN** the pending operator clears, prompt text is unchanged, and the unmatched key sequence is not inserted into the prompt

#### Scenario: Invalid case operator binding falls back safely

- **WHEN** `piVimMode.keymap.operators.lowercase`, `uppercase`, or `toggleCase` contains an unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling keymap fields remain usable

#### Scenario: Live editor uses configured case operator

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that include a configured case operator
- **THEN** the editor uses that binding without dropping other command, motion, operator, macro, mark, search, UI, or prompt-transform options

### Requirement: Escape aliases are configurable

The Vim keymap configuration SHALL accept an opt-in `piVimMode.keymap.escape` array of finite key sequences that act as aliases for insert-mode and visual-mode escape behavior without changing normal-mode, operator-pending, or Pi-owned shortcut bindings.

#### Scenario: Default insert escape aliases are absent

- **WHEN** Pi starts with no `piVimMode.keymap.escape` setting
- **THEN** the resolved keymap has no custom escape aliases and ordinary insert-mode text delegation remains unchanged

#### Scenario: Modified-key escape alias is accepted

- **WHEN** `piVimMode.keymap.escape` contains a valid modified-key alias such as `<C-j>` or `<D-j>`
- **THEN** the resolved keymap records that sequence as an escape alias without removing normal-mode `j`, normal-mode `k`, or any other existing normal/visual key binding

#### Scenario: Protected shortcut alias is rejected

- **WHEN** `piVimMode.keymap.escape` contains a protected Pi shortcut such as `enter`, `tab`, `ctrl+c`, or `escape`
- **THEN** that alias is ignored, a warning is recorded, and the protected shortcut keeps its existing Pi or pi-vimmode behavior

#### Scenario: Raw printable text aliases are rejected

- **WHEN** `piVimMode.keymap.escape` contains printable text such as `j`, `jk`, or `jj`
- **THEN** that alias is ignored with a warning so users can still type that text normally in insert mode

#### Scenario: Invalid alias fields fall back safely

- **WHEN** `piVimMode.keymap.escape` is not an array or contains unsupported key values
- **THEN** invalid entries are ignored with warnings and valid sibling keymap settings remain usable

#### Scenario: Escape aliases are finite and non-recursive

- **WHEN** users configure escape aliases
- **THEN** aliases are resolved as finite key sequences only and do not enable recursive mappings, Vimscript, `.vimrc`, insert abbreviations, or timeout-based mapping behavior

### Requirement: Escape aliases are documented and discoverable

The change SHALL document configured escape aliases and keep runtime keymap diagnostics aligned with the effective configuration.

#### Scenario: Settings reference documents escape aliases

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.escape`, examples such as `<C-j>` and `<D-j>`, protected-key rejection, raw printable text rejection, autocomplete behavior, and Ctrl-J terminal ambiguity

#### Scenario: Feature guide documents escape behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** the escape and reset behavior section describes configured escape aliases for leaving insert mode, visual modes, and pending Ex command-lines

#### Scenario: Runtime diagnostics describe escape aliases

- **WHEN** runtime keymap diagnostics such as `:keymap`, `:mapcheck`, `:keybindings`, or `:features` report configured escape aliases
- **THEN** they identify the aliases as escape bindings and do not imply full Vim mapping support

#### Scenario: Automated validation covers insert escape configuration

- **WHEN** `bun test` is executed
- **THEN** tests cover accepted modified-key aliases, rejected protected shortcuts, rejected raw printable text aliases, invalid config fallback, normal-mode keymap preservation, and live editor option cloning for the new setting

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

### Requirement: Insert newline bindings are configurable

The Vim keymap configuration SHALL accept opt-in insert-mode newline bindings for opening a prompt line below or above the current line without enabling a broad insert-mode mapping surface.

#### Scenario: Default insert newline keymap is empty

- **WHEN** Pi starts with no `piVimMode.keymap.insert` setting
- **THEN** the resolved keymap has no insert-mode newline bindings and existing insert-mode Pi delegation is preserved

#### Scenario: Insert line below binding is accepted

- **WHEN** `piVimMode.keymap.insert.openLineBelow` contains a valid modified key such as `ctrl+j`
- **THEN** the resolved keymap records `ctrl+j` as an insert-mode open-line-below binding without changing normal-mode `openLineBelow` bindings

#### Scenario: Insert line above binding is accepted

- **WHEN** `piVimMode.keymap.insert.openLineAbove` contains a valid modified key such as `ctrl+k`
- **THEN** the resolved keymap records `ctrl+k` as an insert-mode open-line-above binding without changing normal-mode `openLineAbove` bindings

#### Scenario: Raw printable insert binding is rejected

- **WHEN** `piVimMode.keymap.insert.openLineBelow` contains raw printable text such as `j`, `oo`, or `open`
- **THEN** that binding is ignored with a warning and valid sibling keymap fields remain usable

#### Scenario: Protected insert binding requires same-layer allow-list

- **WHEN** `piVimMode.keymap.insert.openLineBelow` contains a protected Pi shortcut such as `enter` and the same settings layer does not include it in `piVimMode.keymap.allowProtectedOverrides`
- **THEN** the binding is rejected with a protected-key warning and the shortcut continues to delegate to Pi behavior

#### Scenario: Allow-listed protected insert binding is accepted

- **WHEN** one settings layer configures `piVimMode.keymap.allowProtectedOverrides` with `enter` and `piVimMode.keymap.insert.openLineBelow` with `enter`
- **THEN** the resolved keymap accepts `enter` as an insert-mode open-line-below binding unless another validation rule rejects it

#### Scenario: Invalid insert binding fields preserve valid siblings

- **WHEN** `piVimMode.keymap.insert` contains unsupported field types, unknown insert actions, or invalid key entries alongside valid insert newline bindings
- **THEN** invalid entries produce warnings, valid insert newline bindings remain usable, and valid normal/visual keymap fields remain usable

### Requirement: Insert newline configuration is documented and validated

The change SHALL include automated validation and user-facing documentation for insert-mode line-opening, edit, and navigation keybindings.

#### Scenario: Automated validation covers insert keymap config

- **WHEN** `bun test` is executed
- **THEN** tests cover default empty insert bindings, accepted modified keys for line-opening/edit/navigation actions, raw printable rejection, protected-key allow-list behavior, duplicate insert binding diagnostics, invalid config fallback, live editor option cloning, insert-mode dispatch, autocomplete delegation, and preserved Pi delegation for unconfigured input

#### Scenario: Settings reference documents insert bindings

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.insert.openLineBelow`, `openLineAbove`, `deleteWordBackward`, `deleteWordForward`, `deleteLineBackward`, `deleteLineForward`, `moveWordBackward`, `moveWordForward`, `moveLineStart`, and `moveLineEnd`, including empty defaults, valid key forms, protected-key allow-list requirements, duplicate binding behavior, and non-goals for full insert-mode mappings

#### Scenario: Feature guide documents insert behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents that insert mode delegates to Pi by default and only configured insert line-opening, edit, or movement bindings are handled by pi-vimmode while autocomplete is inactive

### Requirement: Visual reselection participates in semantic keymap configuration

The Vim keymap configuration SHALL expose visual reselection as a finite semantic command action with a default `gv` binding.

#### Scenario: Default visual reselection keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in normal mode with a valid stored last visual selection
- **THEN** pressing `gv` reselects the stored visual selection

#### Scenario: Configured visual reselection key executes

- **WHEN** `piVimMode.keymap.commands.reselectVisual` is set to a valid finite key sequence and the editor is in normal mode with a valid stored last visual selection
- **THEN** pressing that configured key sequence reselects the stored visual selection

#### Scenario: Invalid visual reselection keymap falls back safely

- **WHEN** `piVimMode.keymap.commands.reselectVisual` is configured with an unsupported value or protected key sequence
- **THEN** that invalid binding is ignored, a warning is recorded, and valid sibling keymap fields remain usable

#### Scenario: Visual reselection is normal-mode only

- **WHEN** the editor is in insert mode or an active visual mode
- **THEN** the `reselectVisual` command binding does not steal ordinary insert input or replace existing visual-mode key handling

### Requirement: Insert edit and navigation bindings are configurable

The Vim keymap configuration SHALL accept opt-in insert-mode edit and navigation bindings for finite supported actions while preserving insert-mode Pi delegation by default.

#### Scenario: Default insert edit keymap is empty

- **WHEN** Pi starts with no `piVimMode.keymap.insert` setting
- **THEN** the resolved keymap has no insert-mode edit, navigation, or line-opening bindings and ordinary insert-mode input continues to delegate to Pi

#### Scenario: Insert edit bindings are accepted

- **WHEN** `piVimMode.keymap.insert.deleteWordBackward`, `deleteWordForward`, `deleteLineBackward`, or `deleteLineForward` contains a valid modified key such as `ctrl+w`, `alt+d`, `ctrl+u`, or `ctrl+k`
- **THEN** the resolved keymap records that key for the configured insert edit action without changing normal-mode command, motion, operator, or prompt-transform bindings

#### Scenario: Insert movement bindings are accepted

- **WHEN** `piVimMode.keymap.insert.moveWordBackward`, `moveWordForward`, `moveLineStart`, or `moveLineEnd` contains a valid modified key such as `alt+b`, `alt+f`, `ctrl+a`, or `ctrl+e`
- **THEN** the resolved keymap records that key for the configured insert movement action without changing normal-mode command, motion, operator, or prompt-transform bindings

#### Scenario: Raw printable insert bindings are rejected

- **WHEN** `piVimMode.keymap.insert.deleteWordBackward` or another insert action contains raw printable text such as `j`, `jk`, `jj`, or `oo`
- **THEN** that binding is ignored with a warning and valid sibling insert and normal/visual keymap fields remain usable

#### Scenario: Protected insert binding requires same-layer allow-list

- **WHEN** `piVimMode.keymap.insert.deleteLineForward` contains a protected Pi shortcut such as `enter` and the same settings layer does not include it in `piVimMode.keymap.allowProtectedOverrides`
- **THEN** the binding is rejected with a protected-key warning and that shortcut continues to delegate to Pi behavior

#### Scenario: Duplicate insert binding is diagnosed

- **WHEN** two different `piVimMode.keymap.insert` actions claim the same normalized key sequence
- **THEN** the resolved keymap remains deterministic, a warning names both insert actions, and session startup continues

#### Scenario: Configured insert action dispatches only in insert mode

- **WHEN** an accepted insert edit or movement binding is pressed in insert mode while autocomplete is inactive
- **THEN** pi-vimmode performs the configured prompt-local insert action instead of delegating that key to Pi

#### Scenario: Autocomplete keeps ownership

- **WHEN** autocomplete is active and the user presses a key sequence configured under `piVimMode.keymap.insert`
- **THEN** input delegates to Pi autocomplete behavior rather than executing the insert action

#### Scenario: Prompt transform keybindings remain separate

- **WHEN** `piVimMode.keymap.insert` configures safe insert actions and `piVimMode.keymap.actions` configures prompt transform actions
- **THEN** insert actions perform only physical prompt edits or cursor movement, and prompt transforms continue to dispatch only through `piVimMode.keymap.actions` in supported modal contexts

### Requirement: Keymap grammar diagnostics share resolver semantics

The Vim keymap configuration SHALL keep runtime command resolution and settings diagnostics aligned for finite key sequence enumeration, exact conflicts, and prefix-shadow conflicts.

#### Scenario: Runtime and diagnostics enumerate the same grammar bindings

- **WHEN** the default resolved keymap is inspected by runtime command resolution and by settings diagnostics
- **THEN** both paths see the same finite operator, motion, command, macro, mark, text-object, character-search, search, and prompt-transform action key sequences

#### Scenario: Exact conflicts are diagnosed before dispatch

- **WHEN** settings configure an action key sequence that exactly matches an existing resolved grammar binding
- **THEN** settings resolution rejects the action binding with a warning and runtime dispatch keeps the existing grammar binding behavior

#### Scenario: Prefix shadows are diagnosed before dispatch

- **WHEN** settings configure a binding that is a strict prefix of an existing executable grammar sequence or has an existing executable grammar sequence as its strict prefix
- **THEN** settings resolution rejects the shadowing binding with a warning and runtime dispatch keeps finite deterministic key sequence behavior

#### Scenario: Shared non-executable prefixes remain valid

- **WHEN** two bindings share a common prefix that is not itself executable, such as two `g`-prefixed sequences
- **THEN** settings diagnostics accepts both non-conflicting bindings and runtime resolution waits for the full configured sequence before dispatch

#### Scenario: Refactor preserves default command behavior

- **WHEN** `bun test` is executed after grammar helper extraction
- **THEN** existing default keymap command resolution, pending-prefix invalidation, protected shortcut handling, and action keybinding conflict tests continue to pass without changed user-facing expectations

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
