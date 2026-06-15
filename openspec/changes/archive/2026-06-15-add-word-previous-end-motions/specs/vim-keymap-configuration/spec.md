## ADDED Requirements

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
