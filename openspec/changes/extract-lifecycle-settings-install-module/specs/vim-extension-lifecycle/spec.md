## ADDED Requirements

### Requirement: Lifecycle hooks install the Vim editor component

The Vim extension lifecycle SHALL register Pi hooks that keep the Vim editor component installed across session start, resource discovery, agent end, and session shutdown events.

#### Scenario: Session start installs editor immediately and schedules reinstall

- **WHEN** Pi emits `session_start` with an extension context
- **THEN** the lifecycle installs the Vim editor component for that context immediately and schedules one delayed reinstall for the same context

#### Scenario: Resource discovery installs editor immediately and schedules reinstall

- **WHEN** Pi emits `resources_discover` with an extension context
- **THEN** the lifecycle installs the Vim editor component for that context immediately and schedules one delayed reinstall for the same context

#### Scenario: Agent end reinstalls editor immediately

- **WHEN** Pi emits `agent_end` with an extension context
- **THEN** the lifecycle installs the Vim editor component for that context without scheduling a delayed reinstall

#### Scenario: Existing Vim component is not churned

- **WHEN** the active UI editor component is already the lifecycle's Vim editor factory
- **THEN** installation refreshes Vim options and status but MUST NOT call `setEditorComponent` again

#### Scenario: Non-Vim component is replaced

- **WHEN** the active UI editor component is missing or different from the lifecycle's Vim editor factory
- **THEN** installation sets the UI editor component to the lifecycle's Vim editor factory

### Requirement: Editor factory identity is stable per extension registration

The Vim extension lifecycle SHALL create one stable editor factory per extension registration and use that same factory for every install attempt in that registration.

#### Scenario: Multiple hooks reuse one factory

- **WHEN** multiple lifecycle hooks install the editor during one extension registration
- **THEN** every `setEditorComponent` call receives the same editor factory reference

#### Scenario: New editors receive current options

- **WHEN** the lifecycle editor factory creates a Vim editor after options were refreshed
- **THEN** the created editor receives the latest resolved Vim options snapshot

#### Scenario: Created editors are tracked for cleanup

- **WHEN** the lifecycle editor factory creates a Vim editor instance
- **THEN** the lifecycle tracks that editor instance for later terminal cursor reset

### Requirement: Settings refresh is owned by lifecycle installation

The Vim extension lifecycle SHALL refresh Vim options during each install attempt by loading settings for the active context `cwd` and updating extension status from load warnings.

#### Scenario: Settings load uses context cwd

- **WHEN** installation runs for a context with `cwd`
- **THEN** the lifecycle calls the Vim settings loader with that `cwd`

#### Scenario: Successful settings load sets normal status

- **WHEN** the Vim settings loader returns no warnings during installation
- **THEN** the lifecycle sets status key `pi-vimmode` to `vim`

#### Scenario: Settings warnings set warning status

- **WHEN** the Vim settings loader returns one or more warnings during installation
- **THEN** the lifecycle sets status key `pi-vimmode` to `vim ⚠`

#### Scenario: Config module remains free of lifecycle behavior

- **WHEN** the lifecycle module is extracted
- **THEN** `src/config.ts` remains responsible for resolving/loading Vim options only and MUST NOT register Pi hooks, install editor components, schedule reload work, or track editor instances

### Requirement: Delayed reinstall tolerates stale reload contexts

The Vim extension lifecycle SHALL tolerate stale context failures from delayed reinstall callbacks while preserving immediate install failures.

#### Scenario: Delayed reinstall catches stale context failure

- **WHEN** a scheduled delayed reinstall throws because its context is stale
- **THEN** the lifecycle catches the error and allows later lifecycle hooks to reinstall the editor

#### Scenario: Immediate install failure surfaces

- **WHEN** an immediate install triggered by `session_start`, `resources_discover`, or `agent_end` throws
- **THEN** the lifecycle does not swallow the error before the delayed callback boundary

#### Scenario: Delayed reinstall refreshes settings again

- **WHEN** a scheduled delayed reinstall runs successfully
- **THEN** it refreshes Vim options and status before checking or setting the editor component

### Requirement: Session shutdown resets tracked terminal cursor styles

The Vim extension lifecycle SHALL reset terminal cursor style for tracked Vim editor instances when Pi emits `session_shutdown`.

#### Scenario: Shutdown resets all tracked editors

- **WHEN** Pi emits `session_shutdown` after the lifecycle factory created one or more Vim editors
- **THEN** the lifecycle calls `resetTerminalCursorStyle()` on each tracked editor

#### Scenario: Shutdown clears tracked editors

- **WHEN** tracked editors have been reset during `session_shutdown`
- **THEN** the lifecycle clears its tracked editor set so later shutdown events do not reset the same instances again

#### Scenario: Shutdown without editors is safe

- **WHEN** Pi emits `session_shutdown` before any Vim editor instance was created
- **THEN** the lifecycle completes without throwing

### Requirement: Lifecycle extraction is validated

The change SHALL include automated validation for the extracted lifecycle behavior and preserve existing config/editor validation.

#### Scenario: Lifecycle tests run

- **WHEN** `bun test` is executed
- **THEN** tests cover lifecycle hook registration, immediate install, delayed reinstall scheduling, factory identity, settings refresh/status, stale delayed context handling, and shutdown cleanup

#### Scenario: Existing tests continue to pass

- **WHEN** `bun test` is executed
- **THEN** existing Vim config, buffer, command, render, modal, and editor tests pass without behavior changes

#### Scenario: Typecheck runs

- **WHEN** the repository typecheck command is executed
- **THEN** the Vim mode extension compiles without TypeScript errors
