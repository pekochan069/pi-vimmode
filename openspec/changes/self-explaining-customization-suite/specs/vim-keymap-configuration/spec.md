## ADDED Requirements

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
