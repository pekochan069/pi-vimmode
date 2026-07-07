## MODIFIED Requirements

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

#### Scenario: Shutdown and disable reset tracked cursor state

- **WHEN** Pi emits `session_shutdown` or the user disables pi-vimmode with `/vimmode off`
- **THEN** the lifecycle resets tracked editor terminal cursor styles, clears tracked editors according to existing lifecycle cleanup behavior, and does not leave hardware cursor visibility forced on
