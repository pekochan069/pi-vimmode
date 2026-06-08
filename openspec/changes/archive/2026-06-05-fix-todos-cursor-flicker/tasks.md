## 1. Cursor Policy Tests

- [x] 1.1 Add `VimEditor` tests proving interactive `bar` cursor still enables hardware cursor visibility and writes the bar cursor-shape hint.
- [x] 1.2 Add `VimEditor` tests proving agent-busy state suppresses hardware cursor visibility without changing prompt text, Vim mode, or current cursor style.
- [x] 1.3 Add `VimEditor` tests proving agent-idle restoration reapplies the current mode cursor policy and preserves original Pi hardware cursor visibility when it started enabled.
- [x] 1.4 Add reset coverage proving `resetTerminalCursorStyle()` restores original hardware cursor visibility after busy/idle transitions.

## 2. Lifecycle Tests

- [x] 2.1 Extend lifecycle hook typing and tests to cover `agent_start` registration without regressing existing hook registration assertions.
- [x] 2.2 Add lifecycle tests proving `agent_start` marks existing tracked editors busy and does not install or replace the editor component by itself.
- [x] 2.3 Add lifecycle tests proving editors created while lifecycle is busy start with suppressed hardware cursor visibility.
- [x] 2.4 Add lifecycle tests proving `agent_end` marks tracked editors idle while preserving immediate install, settings refresh, and stable factory behavior.
- [x] 2.5 Add lifecycle tests proving `session_shutdown` and `/vimmode off` reset tracked cursor state and clear tracked editors without leaving hardware cursor forced on.

## 3. Adapter Implementation

- [x] 3.1 Add a small `VimEditor` busy/idle cursor lifecycle method that reapplies hardware cursor visibility without touching modal state, prompt text, registers, marks, macros, search highlights, Ex messages, dot-repeat, or Pi delegation.
- [x] 3.2 Update `VimEditor` hardware cursor visibility policy so agent-busy state hides the hardware cursor and idle state restores `bar`/original-visibility behavior with existing redundant-call guards.
- [x] 3.3 Keep cursor-shape writes deduplicated by effective style and keep `resetTerminalCursorStyle()` restoring original hardware cursor visibility plus reset escape.

## 4. Lifecycle Implementation

- [x] 4.1 Widen the tracked editor interface in `src/lifecycle.ts` to include busy/idle cursor lifecycle control.
- [x] 4.2 Track current agent busy state in lifecycle and apply it to editors created by the stable editor factory.
- [x] 4.3 Register an `agent_start` hook that marks tracked editors busy without changing editor component identity.
- [x] 4.4 Update `agent_end`, `session_shutdown`, and `/vimmode off` paths so tracked editors return to safe idle/reset cursor state.

## 5. Render and Documentation

- [x] 5.1 Run existing render tests and add focused render coverage only if implementation touches `src/render.ts`; cursor cells must remain one visible cell wide.
- [x] 5.2 Update `docs/features.md` cursor limitations only if observable user-facing cursor behavior changes.
- [x] 5.3 Mark `TODOS.md` cursor flickering problem complete only after implementation and validation pass.

## 6. Validation

- [x] 6.1 Run `bun test` and fix failures.
- [x] 6.2 Run `bun run check-types` and fix TypeScript errors.
- [x] 6.3 Run `bun run lint` and fix lint errors.
- [x] 6.4 Run `bun run format:check` and fix formatting errors.
- [x] 6.5 Run `openspec validate --specs --strict` and fix spec validation errors.
