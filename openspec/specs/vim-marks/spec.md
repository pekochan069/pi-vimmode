# vim-marks Specification

## Purpose

TBD - created by archiving change add-marks. Update Purpose after archive.

## Requirements

### Requirement: Local marks can be set

The Vim editor SHALL support in-memory local mark slots `a` through `z` set from the current cursor position with `m{slot}`.

#### Scenario: Set lowercase local mark

- **WHEN** the editor is in normal mode with the cursor at line 2 column 4 and the user presses `ma`
- **THEN** local mark `a` stores line 2 column 4, prompt text remains unchanged, cursor position remains unchanged, and the editor remains in normal mode

#### Scenario: Setting an existing mark overwrites it

- **WHEN** local mark `a` already stores one position and the user moves the cursor then presses `ma` again
- **THEN** local mark `a` stores the new cursor position and no other mark slot changes

#### Scenario: Invalid set-mark target is safe

- **WHEN** the editor is in normal mode and the user presses `m1`
- **THEN** prompt text, cursor position, mode, visual selection, register, and stored marks are unchanged, and set-mark pending state is cleared

#### Scenario: Incomplete set-mark prefix waits for a slot

- **WHEN** the editor is in normal mode and the user presses `m` without a following slot
- **THEN** prompt text and cursor position remain unchanged and the editor waits for a mark slot key

### Requirement: Normal mode jumps to local marks

The Vim editor SHALL support normal-mode jumps to stored local marks with backtick followed by `{slot}` for exact positions and single quote followed by `{slot}` for marked-line first non-blank positions.

#### Scenario: Exact mark jump restores marked cursor position

- **WHEN** local mark `a` stores line 3 column 5 and the editor is in normal mode elsewhere
- **THEN** pressing backtick followed by `a` moves the cursor to line 3 column 5 without changing prompt text, registers, or stored marks

#### Scenario: Line mark jump restores first non-blank on marked line

- **WHEN** local mark `a` stores any column on a line whose first non-blank character is column 2 and the editor is in normal mode elsewhere
- **THEN** pressing single quote followed by `a` moves the cursor to that marked line at column 2 without changing prompt text, registers, or stored marks

#### Scenario: Line mark jump to blank line uses column zero

- **WHEN** local mark `a` stores a blank line and the editor is in normal mode elsewhere
- **THEN** pressing single quote followed by `a` moves the cursor to the marked line at column 0

#### Scenario: Missing mark jump is safe

- **WHEN** no local mark `z` is stored and the editor is in normal mode
- **THEN** pressing backtick followed by `z` leaves prompt text, cursor position, mode, register, and stored marks unchanged

#### Scenario: Stale mark position is clamped to the current prompt

- **WHEN** local mark `a` stores a position beyond the current prompt after later edits shorten the prompt
- **THEN** pressing backtick followed by `a` moves the cursor to the nearest valid line and column in the current prompt without throwing or editing text

### Requirement: Visual modes jump to local marks

The Vim editor SHALL allow mark jumps in visual, visual-line, and visual-block modes while preserving the original visual anchor and moving the active cursor to the resolved mark target.

#### Scenario: Characterwise visual mark jump extends selection

- **WHEN** the editor is in characterwise visual mode with an anchor and local mark `a` stores another position
- **THEN** pressing backtick followed by `a` keeps the visual anchor, moves the active cursor to mark `a`, and updates the highlighted characterwise selection

#### Scenario: Visual-line mark jump extends selected lines

- **WHEN** the editor is in visual-line mode with an anchor and local mark `a` stores another line
- **THEN** pressing single quote followed by `a` keeps the visual-line anchor, moves the active cursor to mark `a`'s line, and updates the highlighted linewise selection

#### Scenario: Visual-block mark jump moves active corner

- **WHEN** the editor is in visual-block mode with an anchor and local mark `a` stores another position
- **THEN** pressing backtick followed by `a` keeps the visual-block anchor, moves the active cursor to mark `a`, and updates the highlighted rectangular selection

#### Scenario: Missing mark in visual mode is safe

- **WHEN** the editor is in any visual mode and no local mark `z` is stored
- **THEN** pressing single quote followed by `z` preserves prompt text, cursor position, visual anchor, mode, register, and stored marks

### Requirement: Operators accept mark motions

The Vim editor SHALL allow pending delete, change, and yank operators to consume mark jumps as motions, with exact mark jumps producing characterwise ranges and line mark jumps producing linewise ranges.

#### Scenario: Yank to exact mark copies characterwise range

- **WHEN** local mark `a` stores a position in the prompt and the editor is in normal mode at another position
- **THEN** pressing `y` followed by backtick and `a` copies the characterwise range between the cursor and mark `a` to the unnamed register, leaves prompt text unchanged, clears pending operator state, and remains in normal mode

#### Scenario: Delete to line mark removes full line range

- **WHEN** local mark `a` stores a line in the prompt and the editor is in normal mode on another line
- **THEN** pressing `d'a` removes all lines between the cursor line and mark `a`'s line, copies those lines to the unnamed register as linewise text, clears pending operator state, and remains in normal mode

#### Scenario: Change to exact mark enters insert mode

- **WHEN** local mark `a` stores a position in the prompt and the editor is in normal mode at another position
- **THEN** pressing `c` followed by backtick and `a` removes the characterwise range between the cursor and mark `a`, copies the removed text to the unnamed register, clears pending operator state, and enters insert mode

#### Scenario: Missing mark after operator is safe

- **WHEN** no local mark `z` is stored and the editor is in normal mode with delete pending
- **THEN** pressing single quote followed by `z` leaves prompt text, cursor position, mode, register, and stored marks unchanged, and clears pending operator state

#### Scenario: Invalid mark target after operator is safe

- **WHEN** the editor is in normal mode with yank pending and the user presses backtick followed by `1`
- **THEN** prompt text, cursor position, mode, register, and stored marks are unchanged, and pending operator state is cleared

### Requirement: Mark behavior is configurable

The Vim editor SHALL allow mark behavior to be configured with `piVimMode.marks.enabled`, `piVimMode.marks.slots`, and mark prefix keys under `piVimMode.keymap.marks`.

#### Scenario: Disable mark controls

- **WHEN** `piVimMode.marks.enabled` is `false`
- **THEN** mark set and jump controls are ignored as mark controls and do not set pending mark state

#### Scenario: Restrict mark slots

- **WHEN** `piVimMode.marks.slots` is configured to `["x"]`
- **THEN** only local mark slot `x` can be set or jumped to and other slot targets are ignored as invalid mark targets

#### Scenario: Remap mark prefix keys

- **WHEN** `piVimMode.keymap.marks` configures set, exact-jump, and line-jump prefix keys
- **THEN** configured keys replace the default `m`, backtick, and single-quote mark prefixes for normal, visual, and operator mark behavior

### Requirement: Mark scope and validation are documented

The mark change SHALL include automated tests and user-facing documentation for supported slots, set behavior, jump behavior, visual behavior, operator-motion behavior, configuration, stale-mark clamping, and limitations.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover setting marks, overwriting marks, normal jumps, visual jumps, operator mark motions, mark configuration, missing marks, invalid prefixes, stale mark clamping, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Canonical docs document marks

- **WHEN** the user opens `docs/features.md` and `docs/settings.md`
- **THEN** they document `m{slot}`, backtick mark jumps, single-quote mark jumps, configurable mark prefix keys, enabled state, allowed slots, supported lowercase local slots, in-memory scope, stale-mark clamping, and unsupported special/global marks

#### Scenario: TODO is updated after implementation

- **WHEN** the mark implementation and validation pass
- **THEN** `TODOS.md` marks `mark` complete while leaving unrelated remaining TODO items unchanged

### Requirement: Actual editor honors mark configuration

The Vim editor SHALL preserve configured mark behavior from construction through the actual `VimEditor` adapter.

#### Scenario: VimEditor honors disabled marks

- **WHEN** `VimEditor` is constructed with `piVimMode.marks.enabled` resolved to `false`
- **THEN** mark set and jump controls are ignored as mark controls in the live editor and do not set pending mark state

#### Scenario: VimEditor honors restricted mark slots

- **WHEN** `VimEditor` is constructed with `piVimMode.marks.slots` resolved to `["x"]`
- **THEN** only local mark slot `x` can be set or jumped to in the live editor and other slot targets are ignored as invalid mark targets
