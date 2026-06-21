## ADDED Requirements

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
