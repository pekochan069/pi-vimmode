## ADDED Requirements

### Requirement: Hardware cursor visibility avoids agent-work flicker

The Vim editor SHALL keep terminal hardware cursor visibility aligned with the current interaction state while preserving configured cursor styles for interactive prompt editing.

#### Scenario: Interactive bar cursor may show hardware cursor

- **WHEN** the Vim editor is interactive, focused, and the effective cursor style is `bar`
- **THEN** the editor may enable Pi TUI hardware cursor visibility and write the bar cursor-shape hint so the bar cursor remains visible

#### Scenario: Agent work suppresses hardware cursor flicker

- **WHEN** agent work is active and the Vim editor would otherwise show a hardware cursor for `bar` cursor style
- **THEN** the editor hides the hardware cursor while preserving prompt text, modal state, rendered fake cursor output, and the last requested cursor style

#### Scenario: Agent end restores interactive cursor policy

- **WHEN** agent work ends after hardware cursor visibility was suppressed
- **THEN** the editor reapplies the cursor visibility policy for the current Vim mode and original Pi hardware cursor preference

#### Scenario: Original hardware cursor preference is preserved

- **WHEN** Pi TUI originally had hardware cursor visibility enabled before the Vim editor was constructed
- **THEN** the Vim editor preserves that preference outside agent-work suppression and restores it when terminal cursor style is reset

### Requirement: Cursor flicker fix is validated without render regressions

The cursor flicker fix SHALL include automated coverage that preserves cursor rendering width safety and existing prompt-editing behavior.

#### Scenario: Cursor visibility transitions are tested

- **WHEN** `bun test` is executed
- **THEN** tests cover bar cursor hardware visibility during interactive editing, suppression during agent work, restoration after agent work, and reset behavior

#### Scenario: Render width safety remains unchanged

- **WHEN** prompt, visual, search, Ex, and workbench render paths include a cursor marker or cursor styling
- **THEN** every rendered line remains width-safe and prompt text content remains unchanged

#### Scenario: TODO is completed only after validation

- **WHEN** implementation and validation pass for the cursor flicker fix
- **THEN** `TODOS.md` marks the cursor flickering problem complete while leaving unrelated TODO items unchanged
