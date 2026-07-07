## Context

pi-vimmode tracks Pi agent lifecycle events in `src/lifecycle.ts`. On `agent_start`, tracked editors receive `setAgentBusy(true)`; on `agent_end`, they receive `setAgentBusy(false)` and the editor is reinstalled.

`VimEditor` currently applies busy state in `syncHardwareCursorVisibility`. The busy branch hides the hardware cursor for every configured cursor style. This works for block and underline modes, where the rendered fake cursor remains visible enough, but insert mode defaults to a `bar` cursor. The fake bar style is a one-cell ANSI treatment of the underlying character, and it is not reliable on spaces or end-of-line placeholders once the hardware bar is hidden.

## Goals / Non-Goals

**Goals:**

- Keep configured `bar` cursors visible during agent work.
- Keep non-bar cursor suppression during agent work.
- Preserve prompt state, current mode, cursor position, terminal cursor-shape writes, and lifecycle hook behavior.
- Add focused tests that would fail if the busy branch hides a bar cursor again.
- Update user-facing lifecycle docs.

**Non-Goals:**

- Add new settings or cursor styles.
- Rewrite renderer cursor composition.
- Change Pi agent lifecycle hook ordering.
- Add terminal-specific cursor detection, blink control, or cursor negotiation.

## Decisions

### Decision: Change busy cursor policy inside `VimEditor`

Target seam: `src/vim-editor.ts`, specifically `syncHardwareCursorVisibility(style)`.

When `agentBusy` is true, set hardware cursor visibility to `style === "bar"` instead of always `false`.

Alternatives considered:

- Change `src/lifecycle.ts` to avoid marking editors busy for insert mode. Rejected: lifecycle does not own editor mode/style and should stay a broadcast coordinator.
- Add a new `ModalEffect` for busy cursor state. Rejected: busy state is Pi lifecycle state, not modal input state.
- Improve fake bar rendering. Rejected: more rendering risk, still may not match native terminal bar behavior, and issue is caused by hiding the hardware cursor.

### Decision: Preserve non-bar suppression

Target seam: same `syncHardwareCursorVisibility(style)` branch.

Block and underline hardware cursors remain hidden while busy because the existing policy avoids cursor clutter over agent output and docs/tests already rely on busy suppression generally. The change narrows the exception to `bar`, the only style whose hardware cursor carries essential visual information in insert mode.

Alternatives considered:

- Show all hardware cursors while busy. Rejected: broader behavior change than issue #11 needs.
- Hide all hardware cursors and rely on status line only. Rejected: does not fix the reported disappearing insert cursor.

### Decision: Test through live `VimEditor`

Target seam: `test/vim-editor.test.ts`.

Update the existing busy cursor test so bar cursor remains visible during busy state, and keep/adjust coverage for non-bar styles remaining hidden. This exercises constructor state, cursor style policy, and TUI visibility calls together.

Alternatives considered:

- Unit-test a new exported policy helper. Rejected: unnecessary new seam for a two-branch adapter policy.
- Lifecycle-only test. Rejected: lifecycle can prove busy broadcasts, but not cursor-style-specific hardware visibility.

### Decision: Update docs where behavior is described

Target seam: `docs/features.md` activation/lifecycle bullet.

Change the docs from blanket hardware cursor suppression to the narrowed policy: agent work suppresses non-bar hardware cursors while preserving configured bar cursors.

## Risks / Trade-offs

- Some terminals may render a hardware bar over streaming agent output differently → Mitigation: preserve existing non-bar suppression and only keep the insert-style bar visible.
- Existing tests encode old blanket suppression → Mitigation: update tests to encode desired policy, and keep a non-bar suppression assertion.
- Cursor visibility API may be absent in some Pi/TUI versions → Mitigation: existing `setHardwareCursorVisibility` already no-ops when API is unavailable.

## Migration Plan

1. Update `syncHardwareCursorVisibility` busy branch in `src/vim-editor.ts`.
2. Update focused `VimEditor` tests for bar-visible and non-bar-hidden busy behavior.
3. Update `docs/features.md` lifecycle behavior note.
4. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback: revert the small policy change and matching test/docs updates to restore blanket busy suppression.

## Open Questions

None.
