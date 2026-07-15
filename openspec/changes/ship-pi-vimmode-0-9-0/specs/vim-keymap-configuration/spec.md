## MODIFIED Requirements

### Requirement: Trusted global JS keymap builder adds prompt built-in bindings

The Vim editor SHALL load trusted global JavaScript config after global JSON and before project JSON, and SHALL let supported `vim.keymap.set(mode, lhs, rhs, options?)` calls add, replace, or remove finite scoped mappings using opaque action descriptors, bounded replay strings, or `null`.

#### Scenario: JS builder uses prompt built-ins instead of internal action strings

- **WHEN** the JS config default export calls `vim.keymap.set("n", "zq", vim.prompt.reflow({ width: 88 }))`
- **THEN** the resolved normal keymap binds `zq` to reflow prompt transform with width `88`
- **AND** raw string RHS values such as `"prompt.transform.reflow"` are treated only as replay text, not internal action IDs

#### Scenario: JS builder additions preserve preset bindings

- **WHEN** global JSON enables paragraph editing action preset and JavaScript adds `vim.keymap.set("n", "zq", vim.prompt.reflow())`
- **THEN** both preset `gq` binding and JavaScript `zq` binding are accepted for reflow unless a later project layer replaces that semantic action

#### Scenario: Project JSON remains authoritative for semantic action

- **WHEN** JavaScript adds reflow mappings and project JSON sets `piVimMode.keymap.actions.prompt.transform.reflow` to an empty array
- **THEN** final action keybindings contain no reflow mapping from JavaScript or lower layers
- **AND** unrelated JavaScript mappings survive

#### Scenario: JS string RHS replays key inputs

- **WHEN** JavaScript calls `vim.keymap.set("n", "zz", "llll")`
- **THEN** pressing `zz` in normal mode replays `l`, `l`, `l`, `l` through bounded existing macro replay path
- **AND** replay does not recursively expand mappings

#### Scenario: JS insert built-ins bind only insert scope

- **WHEN** JavaScript calls `vim.keymap.set("i", "<A-w>", vim.prompt.deleteWordBackward())`
- **THEN** insert mode treats `alt+w` as configured delete-word-backward action
- **AND** using that insert descriptor in normal, visual, or operator-pending scope is rejected with warning

#### Scenario: JS mapping is removed in selected scope

- **WHEN** JavaScript calls `vim.keymap.set("n", "zq", null)`
- **THEN** exact `zq` mapping visible at JavaScript layer is removed from normal scope
- **AND** same key in disjoint scopes remains unchanged

#### Scenario: Existing three-argument calls remain valid

- **WHEN** pre-0.9.0 JavaScript calls `vim.keymap.set(mode, lhs, rhs)` without options
- **THEN** call retains previously supported behavior without migration

#### Scenario: JS config is trusted global code only

- **WHEN** Pi loads settings for a project
- **THEN** pi-vimmode does not load project-local executable JavaScript config
- **AND** unsupported or fatal global JavaScript exports produce diagnostics instead of crashing startup

## ADDED Requirements

### Requirement: Finite action descriptors define bindable behavior

The JavaScript keymap API SHALL expose opaque immutable descriptors for supported escape, operators, motions, commands, insert actions, macros, marks, text-object kinds/targets, and prompt transform actions.

#### Scenario: Supported action factory returns descriptor

- **WHEN** config calls supported domain action factory with valid finite arguments
- **THEN** returned descriptor can be passed to `vim.keymap.set` in its declared scopes
- **AND** descriptor resolves to existing finite runtime behavior

#### Scenario: Descriptor cannot be forged or mutated

- **WHEN** config passes arbitrary object, mutated descriptor-like value, or unsupported action argument as RHS
- **THEN** mapping is rejected with warning
- **AND** no arbitrary callback or internal action string is executed

#### Scenario: Prompt factories remain aliases

- **WHEN** config uses existing `vim.prompt.*` factory
- **THEN** factory resolves to corresponding supported prompt action descriptor
- **AND** compatibility alias remains valid in 0.9.0

#### Scenario: Descriptor scope is enforced

- **WHEN** config binds a valid descriptor in unsupported scope
- **THEN** only that mapping is rejected with scope warning
- **AND** valid sibling mappings remain usable

### Requirement: JavaScript mappings use canonical finite scopes

The keymap API SHALL normalize supported short and long mode names into normal, visual-family, insert, and operator-pending grammar scopes while keeping operator-pending separate from stable editor mode.

#### Scenario: Normal scope stays normal only

- **WHEN** config binds descriptor using `n` or supported normal long name
- **THEN** mapping dispatches in normal scope
- **AND** does not dispatch in visual, insert, or operator-pending scopes unless separately bound

#### Scenario: Visual aliases cover all visual modes

- **WHEN** config binds descriptor using `v`, `x`, or supported visual long name
- **THEN** mapping dispatches in visual, visual-line, and visual-block modes
- **AND** does not leak into normal or insert scope

#### Scenario: Operator-pending alias addresses grammar state

- **WHEN** config binds valid motion/target descriptor using `o` or supported operator-pending long name
- **THEN** mapping participates only while finite operator grammar awaits target
- **AND** no new stable editor mode is introduced

#### Scenario: Unsupported Neovim mode is rejected

- **WHEN** config uses command-line, select, terminal, language, or another unsupported Neovim mode
- **THEN** mapping is rejected with warning
- **AND** no implied parity behavior is added

#### Scenario: Mode array applies independently

- **WHEN** config passes supported mode array
- **THEN** mapping is validated and applied to each selected concrete scope
- **AND** invalid selected scope prevents only mapping operation according to documented validation

### Requirement: Scoped mapping conflicts are deterministic

The final compiler SHALL resolve exact mappings, unmapping, and strict-prefix conflicts per concrete scope without timeout semantics.

#### Scenario: Latest valid exact mapping wins

- **WHEN** source-ordered JavaScript operations bind same exact key in same scope more than once
- **THEN** latest valid mapping replaces earlier mapping in that scope

#### Scenario: Unmap removes exact mapping only

- **WHEN** `null` RHS targets exact key in selected scope
- **THEN** compiler removes that exact mapping visible at JavaScript layer
- **AND** unrelated keys and disjoint scopes remain unchanged

#### Scenario: Later strict-prefix overlap is rejected

- **WHEN** later mapping key is strict prefix of existing executable mapping or has existing executable mapping as strict prefix in same scope
- **THEN** later mapping is rejected with warning
- **AND** existing finite grammar remains active without timeout

#### Scenario: Disjoint scopes may overlap

- **WHEN** normal and visual scopes bind exact or prefix-overlapping keys independently
- **THEN** both mappings are accepted when each scope grammar is otherwise valid

#### Scenario: Shared non-executable prefix remains valid

- **WHEN** two same-scope mappings share prefix that is not executable mapping
- **THEN** both mappings are accepted
- **AND** runtime waits for complete finite key sequence

### Requirement: Replay and insert mappings remain bounded

The keymap API SHALL keep replay non-recursive and SHALL preserve ordinary insert typing plus Pi autocomplete ownership.

#### Scenario: Normal replay is bounded

- **WHEN** normal or visual mapping uses accepted string replay RHS
- **THEN** runtime replays finite input through existing bounded macro replay path
- **AND** replayed keys do not recursively invoke user mappings

#### Scenario: Insert replay is rejected

- **WHEN** insert mapping uses string replay RHS
- **THEN** mapping is rejected with warning
- **AND** ordinary typing remains Pi-owned

#### Scenario: Printable or multi-key insert mapping is rejected

- **WHEN** insert mapping attempts printable character or unsupported multi-key sequence
- **THEN** mapping is rejected using existing insert-key validation
- **AND** no insert pending-prefix state is added

#### Scenario: Finite insert action is accepted

- **WHEN** insert mapping uses supported insert descriptor on accepted insert key
- **THEN** action dispatches in insert mode
- **AND** existing autocomplete and protected shortcuts retain ownership outside accepted binding

### Requirement: Mapping options are finite and per binding

The optional mapping options object SHALL support only per-binding protected shortcut override and diagnostic description.

#### Scenario: Protected override applies to one mapping

- **WHEN** mapping explicitly opts into protected shortcut override
- **THEN** that binding may pass pi-vimmode protected-shortcut validation
- **AND** other mappings remain protected by default

#### Scenario: Override does not guarantee terminal delivery

- **WHEN** protected override is accepted
- **THEN** diagnostics do not claim terminal or Pi will deliver chord distinctly

#### Scenario: Description is diagnostic only

- **WHEN** mapping supplies description
- **THEN** resolved diagnostics may display description
- **AND** description does not change dispatch or conflict semantics

#### Scenario: Unknown option rejects mapping

- **WHEN** mapping options contain unsupported key or invalid value
- **THEN** that mapping is rejected with warning
- **AND** valid sibling operations remain usable

### Requirement: Final project layer controls semantic actions and exact keys

The scoped compiler SHALL preserve project JSON authority while retaining unrelated valid JavaScript mappings.

#### Scenario: Project semantic action replaces JavaScript mappings

- **WHEN** JavaScript binds multiple keys for one semantic action and project JSON configures that action
- **THEN** project action keys replace JavaScript mappings for that action across canonical scopes
- **AND** unrelated JavaScript mappings remain

#### Scenario: Project exact key wins final conflict

- **WHEN** project JSON produces exact key conflicting with inherited JavaScript mapping in same scope
- **THEN** final project mapping owns that exact key according to supported project precedence

#### Scenario: Final leader moves retained JavaScript mappings

- **WHEN** JavaScript declares `<leader>` mapping and project JSON changes leader
- **THEN** retained JavaScript mapping expands using final project leader before scoped conflict resolution
