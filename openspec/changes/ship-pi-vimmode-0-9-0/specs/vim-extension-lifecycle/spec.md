## ADDED Requirements

### Requirement: Successful reload reconfigures active editors in place

The Vim extension lifecycle SHALL compile a complete valid configuration plan before atomically reconfiguring every tracked active editor without replacing the registered editor component.

#### Scenario: Active editor receives successful reload

- **WHEN** `/vimmode reload` produces complete valid plan
- **THEN** lifecycle commits plan as current
- **AND** calls tracked editor reconfiguration with compiled plan and diagnostics
- **AND** stable editor factory identity remains unchanged

#### Scenario: Reconfiguration updates runtime behavior immediately

- **WHEN** active editor accepts new compiled keymap and option plan
- **THEN** subsequent input uses new settings without creating new prompt editor
- **AND** editor reapplies terminal cursor style and requests render

#### Scenario: New editor receives committed plan

- **WHEN** lifecycle factory creates editor after successful reload
- **THEN** new editor receives same current committed plan used by active editors

#### Scenario: Plan compiles before editor mutation

- **WHEN** loaded configuration contains compile error
- **THEN** no tracked editor receives partial options or lookup tables
- **AND** current committed plan remains unchanged

### Requirement: Active editor reload preserves durable state and clears transient grammar

Editor reconfiguration SHALL preserve durable prompt-editing state while clearing pending input state that may be invalid under new keymap.

#### Scenario: Durable prompt state is preserved

- **WHEN** active editor is reconfigured successfully
- **THEN** prompt buffer, bounds-clamped cursor, stable mode, valid visual selection, registers, marks, macro contents, undo/redo, Ex history, and prompt-search history remain available

#### Scenario: Invalid visual selection is normalized safely

- **WHEN** reconfiguration receives editor state whose visual selection is no longer valid for current prompt bounds
- **THEN** editor clamps or clears selection without mutating prompt text or history

#### Scenario: Pending grammar is cleared

- **WHEN** active editor is reconfigured while count, operator, key prefix, character target, register target, mark target, or macro target is pending
- **THEN** all pending grammar state clears before next key is interpreted

#### Scenario: Active workbench input is cleared

- **WHEN** active editor is reconfigured during Ex command-line or prompt-search input
- **THEN** active workbench input closes and clears
- **AND** persisted Ex and prompt-search histories remain

#### Scenario: Macro recording stops but contents persist

- **WHEN** active editor is reconfigured while macro recording is active
- **THEN** recording slot closes
- **AND** previously recorded macro contents remain

### Requirement: Reload generations prevent stale async commits

The lifecycle SHALL assign reload generations and SHALL allow only newest successful generation to update current plan, diagnostics, status, and active editors.

#### Scenario: Newer reload finishes first

- **WHEN** two reloads overlap and newer generation finishes successfully before older generation
- **THEN** newer plan commits
- **AND** later completion of older generation cannot replace it or its diagnostics

#### Scenario: Older reload finishes first

- **WHEN** two reloads overlap and older generation finishes successfully before newer generation
- **THEN** older result does not commit once newer generation exists
- **AND** newest successful generation determines final state

#### Scenario: Latest reload fails fatally

- **WHEN** latest generation has fatal JavaScript evaluation failure
- **THEN** lifecycle updates diagnostics/status to report failure
- **AND** preserves last-known-good plan and active editor state

#### Scenario: Fresh startup failure remains usable

- **WHEN** first load has fatal JavaScript config failure
- **THEN** lifecycle installs editor using plan compiled from defaults, global JSON, and project JSON
- **AND** warning status reports omitted JavaScript layer

### Requirement: Transactional reload is validated through lifecycle and real editor seams

The change SHALL include automated coverage proving reload ordering and state reconciliation without private Pi state.

#### Scenario: Lifecycle tests cover generation ordering

- **WHEN** `bun test` runs
- **THEN** lifecycle tests cover overlapping async completion, latest-success commit, fatal rollback, diagnostics/status updates, and stable factory identity

#### Scenario: Real editor tests cover reconfiguration state

- **WHEN** `bun test` runs
- **THEN** real editor scenarios cover exact durable-state preservation, transient-state clearing, cursor clamping, cursor-style reapplication, and immediate new keymap behavior

#### Scenario: Existing lifecycle behavior stays valid

- **WHEN** lifecycle validation runs after reload implementation
- **THEN** existing installation, delayed reinstall, busy/idle cursor policy, shutdown cleanup, and new-editor option refresh behavior continue to pass
