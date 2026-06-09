## ADDED Requirements

### Requirement: Prompt transforms can be invoked by action keybindings

The Vim editor SHALL allow existing prompt transform behavior to be invoked by accepted action keybindings in supported modal contexts.

#### Scenario: Normal current-line transform executes

- **WHEN** `prompt.transform.quote` is bound to `g>` and the editor is in normal mode
- **THEN** pressing `g>` quotes the current prompt line using existing prompt transform behavior

#### Scenario: Counted line-range transform executes

- **WHEN** `prompt.transform.bulletize` is bound to `g*` and the user presses `3g*` in normal mode
- **THEN** the current line and next two prompt lines are bulletized

#### Scenario: Fence action uses configured language arg

- **WHEN** `prompt.transform.fence` is bound to `gT` with `{ "language": "ts" }`
- **THEN** pressing `gT` wraps the target range in a code fence whose opening fence includes `ts`

#### Scenario: Reflow action uses configured width arg

- **WHEN** `prompt.transform.reflow` is bound to `gq` with `{ "width": 72 }`
- **THEN** pressing `gq` reflows the target prose using width 72 according to existing reflow rules

#### Scenario: Visual character action transforms touched lines

- **WHEN** the editor is in characterwise visual mode and the user invokes a keybound prompt transform action
- **THEN** the action transforms all prompt lines touched by the visual selection

#### Scenario: Visual-line action transforms selected lines

- **WHEN** the editor is in visual-line mode and the user invokes a keybound prompt transform action
- **THEN** the action transforms the selected prompt lines

#### Scenario: Visual-block action transforms touched lines

- **WHEN** the editor is in visual-block mode and the user invokes a keybound prompt transform action
- **THEN** the action transforms the touched prompt lines linewise rather than transforming only rectangular cells

#### Scenario: Visual action ignores count

- **WHEN** the editor is in any visual mode, a visual selection is active, and the user invokes a keybound prompt transform action with a numeric count
- **THEN** the action transforms the selected touched lines once and ignores the count

#### Scenario: Visual action exits visual mode after recognized action

- **WHEN** the editor is in any visual mode and a keybound prompt transform action is recognized, whether or not it changes prompt text
- **THEN** the editor returns to normal mode and clears the visual selection

#### Scenario: Unsupported action target is safe

- **WHEN** an action is invoked in a mode or target context it does not support
- **THEN** prompt text remains unchanged and feedback is emitted only according to resolved feedback settings
