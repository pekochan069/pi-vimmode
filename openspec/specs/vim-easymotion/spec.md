# vim-easymotion Specification

## Purpose

TBD - created by archiving change render-only-easymotion-labels. Update Purpose after archive.

## Requirements

### Requirement: EasyMotion character targeting is finite and opt-in

The Vim editor SHALL start EasyMotion character targeting only through an explicitly configured EasyMotion command binding and SHALL assign deterministic single-character labels to case-insensitive matches across the current prompt.

#### Scenario: Configured command finds prompt matches

- **WHEN** the user invokes a configured EasyMotion command and enters a character present in the prompt with either letter case
- **THEN** the editor displays labels for matching characters across prompt lines without moving the cursor

#### Scenario: No command binding configured

- **WHEN** no EasyMotion command binding resolves for an input sequence
- **THEN** that input does not enter pending EasyMotion state

#### Scenario: Character has no matches

- **WHEN** EasyMotion is waiting for a target character and the user enters a character absent from the prompt
- **THEN** the editor clears pending EasyMotion state without changing prompt text or cursor position

#### Scenario: Match count exceeds available labels

- **WHEN** the prompt contains more than 52 case-insensitive matches for the target character
- **THEN** the editor labels only the first 52 matches in prompt order using the existing lowercase-then-uppercase label sequence

### Requirement: EasyMotion labels are render-only

The Vim editor SHALL render EasyMotion labels as transient visual substitutions over target cells and MUST NOT write label text into the prompt buffer.

#### Scenario: Highlight state displays labels without editing

- **WHEN** EasyMotion enters highlight state for one or more targets
- **THEN** the rendered prompt displays each target label while the prompt text remains byte-identical

#### Scenario: Configured label color is applied

- **WHEN** EasyMotion labels are visible and `piVimMode.easymotion.labelColor` specifies an ANSI color
- **THEN** each non-cursor, non-selected target label uses that color followed by an ANSI reset

#### Scenario: Target occupies a wide cell

- **WHEN** an EasyMotion target occupies a terminal cell wider than its label
- **THEN** the renderer preserves the target cell's visible width and all rendered rows remain terminal-width safe

#### Scenario: Label overlaps cursor or visual selection

- **WHEN** an EasyMotion target coordinate also contains the cursor or active visual-selection styling
- **THEN** the target label remains visible while existing cursor or selection styling retains precedence over EasyMotion label color

#### Scenario: Label overlaps search highlight

- **WHEN** an EasyMotion target coordinate also has search highlighting
- **THEN** the EasyMotion label is rendered at that coordinate without changing stored search state or prompt text

### Requirement: EasyMotion exits preserve prompt content

The Vim editor SHALL keep prompt text unchanged when EasyMotion is cancelled, receives an invalid label, or completes a valid selection.

#### Scenario: Escape cancels EasyMotion

- **WHEN** the user presses `Escape` while EasyMotion is waiting for a target character or label
- **THEN** pending EasyMotion state and visible labels clear while prompt text and cursor position remain unchanged

#### Scenario: Valid label moves cursor

- **WHEN** the user enters a visible EasyMotion label
- **THEN** pending EasyMotion state clears, prompt text remains unchanged, and the cursor moves to that label's target coordinate

#### Scenario: Invalid label is safe

- **WHEN** the user enters a label that is not assigned in the current EasyMotion highlight state
- **THEN** prompt text and cursor position remain unchanged and the current labels remain available for a valid selection or cancellation

#### Scenario: Lowercase and uppercase labels remain distinct

- **WHEN** targets have both lowercase and uppercase labels
- **THEN** selecting either label moves to its exact assigned target without changing prompt text

### Requirement: EasyMotion preserves editor side-effect state

The Vim editor SHALL treat EasyMotion highlighting as transient presentation and SHALL preserve prompt edit history and unrelated modal side-effect state.

#### Scenario: Undo skips EasyMotion presentation

- **WHEN** the user makes a real prompt edit, opens or completes EasyMotion, and then invokes undo
- **THEN** undo immediately reverses the prior real prompt edit rather than any EasyMotion label display

#### Scenario: Redo survives EasyMotion cancellation

- **WHEN** undo creates redo state and the user opens then cancels EasyMotion before invoking redo
- **THEN** redo restores the undone real prompt edit

#### Scenario: Unrelated modal state is preserved

- **WHEN** EasyMotion is opened, cancelled, given an invalid label, or completed
- **THEN** registers, marks, macro slots, dot-repeat state, search state, visual-selection history, and Ex message history remain unchanged

#### Scenario: Automated validation covers EasyMotion ownership

- **WHEN** repository validation runs
- **THEN** focused tests verify render-only labels, cancellation, valid and invalid selection, multiline targets, label limits, configured color, and undo/redo preservation

### Requirement: EasyMotion behavior is documented accurately

User-facing documentation SHALL describe EasyMotion as an opt-in prompt-wide character-targeting command whose labels are rendered without changing prompt text.

#### Scenario: User reads EasyMotion documentation

- **WHEN** the user reads the feature guide or README summary
- **THEN** the documentation identifies the configured EasyMotion command, prompt-wide matching, render-only labels, 52-target limit, and configurable label color without claiming that `f`, `t`, `F`, or `T` trigger EasyMotion
