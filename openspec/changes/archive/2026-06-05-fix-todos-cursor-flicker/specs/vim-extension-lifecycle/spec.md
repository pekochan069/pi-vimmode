## ADDED Requirements

### Requirement: Agent lifecycle coordinates editor hardware cursor visibility

The Vim extension lifecycle SHALL coordinate tracked Vim editor cursor visibility with Pi agent busy and idle events without replacing the active editor component or losing prompt state.

#### Scenario: Agent start suppresses tracked editor hardware cursors

- **WHEN** Pi emits `agent_start` after one or more Vim editor instances have been created by the lifecycle factory
- **THEN** the lifecycle marks each tracked editor as agent-busy so hardware cursor visibility is suppressed during agent work

#### Scenario: Agent start before editor creation is safe

- **WHEN** Pi emits `agent_start` before any Vim editor instance has been created
- **THEN** the lifecycle records the busy state without throwing and without installing or replacing the editor component solely because of `agent_start`

#### Scenario: Editor created during busy state starts suppressed

- **WHEN** the lifecycle factory creates a Vim editor while the lifecycle is in agent-busy state
- **THEN** the new editor receives that busy state before it can leave the hardware cursor visible

#### Scenario: Agent end restores tracked editor cursor policy

- **WHEN** Pi emits `agent_end` after one or more Vim editor instances were marked agent-busy
- **THEN** the lifecycle marks each tracked editor as no longer busy and preserves the existing immediate editor installation behavior

#### Scenario: Shutdown and disable reset tracked cursor state

- **WHEN** Pi emits `session_shutdown` or the user disables pi-vimmode with `/vimmode off`
- **THEN** the lifecycle resets tracked editor terminal cursor styles, clears tracked editors according to existing lifecycle cleanup behavior, and does not leave hardware cursor visibility forced on

### Requirement: Agent cursor lifecycle is validated

The lifecycle change SHALL include automated coverage for busy/idle cursor coordination while preserving existing lifecycle installation behavior.

#### Scenario: Lifecycle tests cover busy and idle transitions

- **WHEN** `bun test` is executed
- **THEN** lifecycle tests cover `agent_start`, `agent_end`, editor creation before and during busy state, shutdown cleanup, and `/vimmode off` cleanup

#### Scenario: Existing install behavior remains stable

- **WHEN** lifecycle install hooks run for `session_start`, `resources_discover`, and `agent_end`
- **THEN** stable factory identity, settings refresh, delayed reinstall, status updates, and stale delayed-context handling continue to satisfy existing lifecycle requirements
