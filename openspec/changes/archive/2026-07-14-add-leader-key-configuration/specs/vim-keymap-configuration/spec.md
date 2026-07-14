## ADDED Requirements

### Requirement: Leader setting resolves across JSON and trusted JavaScript layers

The Vim editor SHALL support an optional leader mapping prefix through `piVimMode.leader` in global and project JSON settings and `vim.g.mapleader` in trusted global JavaScript config. A leader value MUST be exactly one printable character or `null`, MUST default to unset, and MUST resolve using global JSON, trusted global JavaScript, then project JSON precedence.

#### Scenario: Leader defaults to unset

- **WHEN** no settings layer configures a leader
- **THEN** the resolved options contain no leader and mappings without `<leader>` keep existing behavior

#### Scenario: JSON leader configures a printable prefix

- **WHEN** global or project `piVimMode.leader` is set to one printable character such as space, comma, or backslash
- **THEN** the resolved options retain that character as the effective leader

#### Scenario: Trusted JavaScript configures mapleader

- **WHEN** trusted global JS assigns one printable character to `vim.g.mapleader`
- **THEN** that character overrides a valid global JSON leader and remains subject to a valid project JSON override

#### Scenario: Later layer clears inherited leader

- **WHEN** a later JSON layer sets `piVimMode.leader` to `null` or trusted JS assigns `null` to `vim.g.mapleader`
- **THEN** that layer clears the inherited leader unless a still-later valid layer configures one

#### Scenario: Invalid leader preserves valid lower layer

- **WHEN** a later layer sets leader to an empty string, multi-character string, non-printable character, or unsupported type
- **THEN** the invalid field is ignored with a non-fatal warning, the previous valid leader remains effective, and valid sibling fields remain usable

### Requirement: Leader placeholder expands retained mapping keys

The Vim editor SHALL validate case-insensitive `<leader>` entries in each settings layer against final effective leader, overlay retained configured mapping keys by normal precedence, then expand keys that begin with `<leader>` before keymap conflict resolution and runtime compilation. Expansion MUST apply only to mapping keys or LHS values and MUST preserve existing mapping-category validation, valid lower-layer fallback, and explicit empty-array clears.

#### Scenario: JSON leader action expands

- **WHEN** JSON sets leader to space and configures an action, command, motion, operator, macro, mark, or remap key containing `<leader>q`
- **THEN** that accepted binding resolves with the physical key sequence ` q`

#### Scenario: Trusted JavaScript leader mapping expands

- **WHEN** JS assigns comma to `vim.g.mapleader` and calls `vim.keymap.set("n", "<Leader>q", vim.prompt.reflow())`
- **THEN** the resolved normal-mode reflow binding uses the physical key sequence `,q`

#### Scenario: Repeated placeholder expands

- **WHEN** an accepted mapping key contains `<leader><Leader>` and the final leader is comma
- **THEN** the resolved physical mapping key is `,,`

#### Scenario: Project leader moves inherited mappings

- **WHEN** global JSON or trusted JS defines `<leader>` mappings and project JSON sets a different valid leader
- **THEN** all retained inherited and project leader mappings use the final project leader

#### Scenario: Project clear removes inherited leader ownership

- **WHEN** global JSON defines a leader action, trusted JS adds another binding for that action, and project JSON clears that action with an empty array or clears leader with `null`
- **THEN** no removed or unresolved mapping leaves stale leader-prefix reservation

#### Scenario: Literal replacement removes leader provenance

- **WHEN** a higher-priority layer replaces an inherited `<leader>` mapping with a literal physical key sequence
- **THEN** the retained literal mapping does not activate leader reservation unless another retained normal/visual mapping begins with `<leader>`

#### Scenario: Missing leader drops affected mappings

- **WHEN** retained mapping keys use `<leader>` and the final leader is unset
- **THEN** each affected mapping is ignored with a non-fatal warning while valid sibling mappings remain usable

#### Scenario: Lone placeholder is rejected

- **WHEN** a mapping key consists only of one `<leader>` placeholder
- **THEN** that mapping is ignored with a non-fatal warning because leader requires a following mapping key

#### Scenario: Mid-sequence placeholder is rejected

- **WHEN** a mapping key contains a normal key before `<leader>`, such as `g<leader>x`
- **THEN** that mapping is ignored with a non-fatal warning because leader must begin the mapping key

#### Scenario: Replay RHS does not expand leader

- **WHEN** a JS string replay RHS contains `<leader>` notation
- **THEN** pi-vimmode does not substitute the configured leader into that replay input

#### Scenario: Existing category rules remain authoritative

- **WHEN** leader expansion would produce a printable insert-mode sequence or a multi-key text-object binding
- **THEN** that binding is ignored with the existing category warning and no insert pending-key behavior is added

### Requirement: Retained leader mappings reserve normal and visual grammar prefix

The Vim editor SHALL reserve the effective leader prefix across normal and visual keymap grammar only when at least one accepted normal/visual mapping beginning with `<leader>` remains in the final effective keymap. Any such mapping MUST activate reservation across normal and all visual modes; insert-only mappings MUST NOT activate reservation.

#### Scenario: Leader setting alone preserves existing grammar

- **WHEN** leader is configured but no accepted mapping uses `<leader>`
- **THEN** counts, registers, marks, macros, visual transforms, and existing keymap bindings retain current behavior

#### Scenario: Rejected insert leader mapping does not reserve normal grammar

- **WHEN** leader is comma and an insert escape or insert action key uses printable `<leader>q`
- **THEN** existing insert validation rejects that mapping and normal and visual comma grammar remains unchanged

#### Scenario: Leader mapping overrides inherited exact binding

- **WHEN** leader is comma and an accepted normal or visual mapping uses `<leader>q`
- **THEN** comma enters the leader prefix instead of executing the inherited reverse character-search repeat binding in normal or visual mode

#### Scenario: Digit leader overrides count entry

- **WHEN** leader is `1` and an accepted mapping uses `<leader>q`
- **THEN** `1q` executes the leader mapping and `1` enters the leader prefix instead of numeric count input

#### Scenario: Quote leader overrides register entry

- **WHEN** leader is `"` and an accepted mapping uses `<leader>q`
- **THEN** quote enters the leader prefix instead of named-register selection

#### Scenario: Visual structural key leader overrides direct transform

- **WHEN** leader is `u`, an accepted visual mapping uses `<leader>q`, and the editor is in a supported visual mode
- **THEN** `u` enters the leader prefix instead of immediately lowercasing the visual selection

#### Scenario: Visual-only mapping reserves normal mode too

- **WHEN** an accepted visual-only mapping begins with `<leader>`
- **THEN** the selected leader prefix is reserved across normal and all visual modes

#### Scenario: Pending operand keeps ownership

- **WHEN** an operator, register, mark, macro, search, or other finite operand is already pending and the next character equals the leader
- **THEN** the existing pending grammar handles that character rather than starting a new leader sequence

#### Scenario: Invalid leader continuation is safe

- **WHEN** the editor has a pending leader prefix and the next key completes no accepted mapping
- **THEN** pending state clears, prompt text and durable editor side-effect state remain unchanged, no new Ex message is emitted, standard transient-message clearing may occur, and the unmatched printable key is not inserted

### Requirement: Leader configuration is documented and validated

The change SHALL include automated validation and user documentation for leader configuration.

#### Scenario: Resolved views show physical keys

- **WHEN** a user inspects resolved keybindings after configuring leader mappings
- **THEN** keybinding and help views show expanded physical key sequences rather than `<leader>` source notation

#### Scenario: Settings reference documents both config surfaces

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.leader`, `vim.g.mapleader`, JSON and JS examples, precedence, `null` clearing, validation warnings, prefix reservation, and non-goals

#### Scenario: Automated leader validation runs

- **WHEN** `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and strict OpenSpec validation are executed
- **THEN** leader parsing, layer precedence, placeholder expansion, prefix reservation, modal dispatch, option cloning, docs, types, lint, formatting, and specifications pass
