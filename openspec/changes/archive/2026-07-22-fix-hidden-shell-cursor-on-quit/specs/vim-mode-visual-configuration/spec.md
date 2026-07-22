## MODIFIED Requirements

### Requirement: Hardware cursor visibility avoids agent-work flicker

The Vim editor SHALL keep terminal hardware cursor visibility aligned with the effective cursor style and lifecycle state while preserving configured cursor styles for interactive prompt editing. During agent work, an active `bar` hardware cursor SHALL remain visible, while active `block` and `underline` hardware cursors SHALL be suppressed.

#### Scenario: Interactive bar cursor shows hardware cursor

- **WHEN** the Vim editor is interactive, focused, and the effective cursor style is `bar`
- **THEN** the editor enables Pi TUI hardware cursor visibility and writes the bar cursor-shape hint so the bar cursor remains visible

#### Scenario: Agent work preserves bar hardware cursor

- **WHEN** agent work is active and the effective cursor style is `bar`
- **THEN** the editor keeps the hardware cursor visible while preserving prompt text, modal state, rendered fake cursor output, and the last requested cursor style

#### Scenario: Agent work suppresses non-bar hardware cursors

- **WHEN** agent work is active and the effective cursor style is `block` or `underline`
- **THEN** the editor suppresses the hardware cursor while preserving prompt text, modal state, rendered fake cursor output, and the last requested cursor style

#### Scenario: Agent end restores interactive cursor policy

- **WHEN** agent work ends after cursor visibility was coordinated for busy state
- **THEN** the editor reapplies the cursor visibility policy for the current Vim mode and original Pi hardware cursor preference

#### Scenario: Runtime reset restores original hardware cursor preference

- **WHEN** terminal cursor style is reset while Pi remains active
- **THEN** the Vim editor restores the hardware cursor visibility policy captured before the editor was constructed

#### Scenario: Terminal-exit reset leaves visibility to Pi

- **WHEN** terminal cursor style is reset while Pi is exiting
- **THEN** the Vim editor resets cursor shape without mutating Pi's hardware cursor visibility policy
