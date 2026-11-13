## ADDED Requirements

### Requirement: Opt-in leader preview

The system SHALL render a preview below the editor when `piVimMode.whichKey.enabled` is true, the editor is in Normal mode, and the pending sequence begins with the configured leader.

#### Scenario: Disabled by default

- **WHEN** no which-key configuration is provided
- **THEN** no preview is rendered

#### Scenario: Leader preview

- **WHEN** a configured leader is pressed with matching Normal-mode action bindings
- **THEN** the preview replaces the editor's normal lower border with a title border, shows a selected-style typed suffix and available continuations, and places the normal status line directly below the last candidate or overflow row

### Requirement: Collapsed prefixes

The system SHALL collapse action bindings that share the same next key into one row.

#### Scenario: Named group

- **WHEN** `whichKey.groups` names a matching prefix
- **THEN** the collapsed row displays the configured label with a `+` prefix immediately after the key and the panel title uses the deepest matching label in uppercase

#### Scenario: Unnamed group

- **WHEN** a shared prefix has no configured label
- **THEN** the collapsed row displays its actual binding count

### Requirement: Pi command descriptions

The system SHALL render a `pi.command` leaf with its slash command in the primary column. It SHALL use the current Pi autocomplete provider's description when available, and the binding `desc` only as fallback.

#### Scenario: Provider description

- **WHEN** Pi autocomplete describes `/model`
- **THEN** the `/model` leaf uses that description with the passive unselected slash-autocomplete row style

#### Scenario: Description fallback

- **WHEN** Pi autocomplete has no description for a configured command and the binding has `desc`
- **THEN** the slash command remains visible and the binding description is shown

### Requirement: Bounded complete panel

The system SHALL suppress the preview when the terminal cannot fit its title, typed row, at least one candidate row, final status line, and four editor rows.

#### Scenario: Short terminal

- **WHEN** the available terminal rows cannot fit the complete panel
- **THEN** the preview is not rendered and the editor remains usable

### Requirement: Passive rendering

The preview SHALL not capture editor input.

#### Scenario: Mapping dispatch

- **WHEN** a user continues a previewed mapping
- **THEN** the normal modal resolver receives the key and dispatches the mapping normally

### Requirement: Backspace navigation

The system SHALL remove one complete key token when Backspace is pressed during a leader-pending sequence and `whichKey.enabled` is true.

#### Scenario: Root Backspace

- **WHEN** the pending sequence is the bare leader and the preview is enabled
- **THEN** Backspace preserves the pending leader sequence

#### Scenario: Disabled preview

- **WHEN** `whichKey.enabled` is false
- **THEN** Backspace follows the existing keymap resolver behavior
