## MODIFIED Requirements

### Requirement: Session shutdown resets tracked terminal cursor styles

The Vim extension lifecycle SHALL reset terminal cursor shape for tracked Vim editor instances when Pi emits `session_shutdown`. For terminal exit with reason `quit`, cleanup MUST leave final hardware cursor visibility to Pi; for runtime transition reasons, cleanup SHALL restore each editor's captured Pi hardware cursor visibility policy.

#### Scenario: Quit resets shape without restoring visibility policy

- **WHEN** Pi emits `session_shutdown` with reason `quit` after the lifecycle factory created one or more Vim editors
- **THEN** the lifecycle resets each tracked editor's terminal cursor shape without restoring its captured hardware cursor visibility policy

#### Scenario: Runtime transition restores visibility policy

- **WHEN** Pi emits `session_shutdown` with reason `reload`, `new`, `resume`, or `fork` after the lifecycle factory created one or more Vim editors
- **THEN** the lifecycle resets each tracked editor's terminal cursor shape and restores its captured hardware cursor visibility policy

#### Scenario: Shutdown clears tracked editors

- **WHEN** tracked editors have been reset during `session_shutdown`
- **THEN** the lifecycle clears its tracked editor set so later shutdown events do not reset the same instances again

#### Scenario: Shutdown without editors is safe

- **WHEN** Pi emits `session_shutdown` before any Vim editor instance was created
- **THEN** the lifecycle completes without throwing

### Requirement: Agent lifecycle coordinates editor hardware cursor visibility

The Vim extension lifecycle SHALL coordinate tracked Vim editor cursor visibility with Pi agent busy and idle events without replacing the active editor component or losing prompt state. During agent-busy state, the Vim editor SHALL preserve hardware cursor visibility for an active `bar` cursor style and SHALL suppress hardware cursor visibility for active `block` or `underline` cursor styles.

#### Scenario: Agent start preserves tracked bar hardware cursors

- **WHEN** Pi emits `agent_start` after one or more Vim editor instances with an active `bar` cursor style have been created by the lifecycle factory
- **THEN** the lifecycle marks each tracked editor as agent-busy and each active `bar` hardware cursor remains visible during agent work

#### Scenario: Agent start suppresses tracked non-bar hardware cursors

- **WHEN** Pi emits `agent_start` after one or more Vim editor instances with an active `block` or `underline` cursor style have been created by the lifecycle factory
- **THEN** the lifecycle marks each tracked editor as agent-busy and each active non-bar hardware cursor is suppressed during agent work

#### Scenario: Agent start before editor creation is safe

- **WHEN** Pi emits `agent_start` before any Vim editor instance has been created
- **THEN** the lifecycle records the busy state without throwing and without installing or replacing the editor component solely because of `agent_start`

#### Scenario: Editor created during busy state starts with busy cursor policy

- **WHEN** the lifecycle factory creates a Vim editor while the lifecycle is in agent-busy state
- **THEN** the new editor receives that busy state before it can expose incorrect hardware cursor visibility, preserving active `bar` cursor visibility and suppressing active non-bar cursor visibility

#### Scenario: Agent end restores tracked editor cursor policy

- **WHEN** Pi emits `agent_end` after one or more Vim editor instances were marked agent-busy
- **THEN** the lifecycle marks each tracked editor as no longer busy and preserves the existing immediate editor installation behavior

#### Scenario: Runtime disable restores tracked cursor state

- **WHEN** the user disables pi-vimmode with `/vimmode off`
- **THEN** the lifecycle resets tracked editor terminal cursor shapes, restores captured hardware cursor visibility policies, and clears tracked editors according to existing runtime cleanup behavior

#### Scenario: Terminal exit leaves final visibility to Pi

- **WHEN** Pi emits `session_shutdown` with reason `quit`
- **THEN** the lifecycle resets tracked editor terminal cursor shapes, does not mutate Pi's hardware cursor visibility policy, and clears tracked editors
