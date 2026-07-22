## Context

`VimEditor.resetTerminalCursorStyle()` currently performs two independent actions: it restores the captured Pi hardware cursor visibility policy and emits the default terminal cursor-shape sequence. Pi stops its TUI and shows the hardware cursor before extension disposal on normal quit, so restoring a captured `false` policy during the later `session_shutdown` handler hides the shell cursor again.

Pi's `session_shutdown` event also represents in-process transitions (`reload`, `new`, `resume`, and `fork`). Those paths still need runtime cleanup that restores the captured Pi policy. `/vimmode off` likewise runs while Pi remains active.

## Goals / Non-Goals

**Goals:**

- Leave final hardware cursor visibility to Pi during terminal exit.
- Continue resetting pi-vimmode's terminal cursor shape on every cleanup path.
- Preserve captured visibility restoration for runtime cleanup.
- Make the lifecycle distinction explicit and regression-tested.
- Align durable cursor specs with current insert-bar behavior during agent work.

**Non-Goals:**

- Change Pi or pi-tui shutdown ordering.
- Add settings, dependencies, or public configuration.
- Change prompt text, cursor position, modal state, registers, marks, dot-repeat, search highlights, visual state, Ex messages, or Pi shortcut delegation.
- Implement broader Vim terminal-cursor parity.

## Decisions

### Interpret shutdown reason in `src/lifecycle.ts`

The lifecycle handler SHALL classify only `session_shutdown.reason === "quit"` as terminal-exit cleanup. It will pass a narrow cleanup option through `resetKnownEditors`; `VimEditor` will not receive Pi lifecycle events.

Alternative: pass the raw shutdown reason into `VimEditor`. Rejected because it couples the runtime adapter's cursor reset API to Pi session lifecycle semantics.

Alternative: suppress visibility restoration for every `session_shutdown`. Rejected because reload, new, resume, and fork keep Pi active and still require runtime cleanup.

### Keep runtime restoration as the default editor reset behavior

`resetTerminalCursorStyle()` SHALL accept an optional `restoreHardwareCursorVisibility` flag that defaults to `true`. Existing callers therefore retain runtime cleanup behavior; terminal exit explicitly opts out.

Alternative: require every caller to select a cleanup mode. Rejected because it expands the diff and migration risk without improving the single exceptional path.

Alternative: add two near-identical reset methods. Rejected because one option expresses the only behavioral difference without duplicating cleanup logic.

### Reset shape but do not mutate visibility on quit

Terminal-exit cleanup SHALL clear cached cursor style and emit the default cursor-shape sequence, but SHALL NOT call Pi's hardware cursor visibility setter. Pi remains sole owner of final shell cursor visibility.

Alternative: emit a show-cursor sequence after cleanup. Rejected because it competes with host ownership and repairs the symptom rather than avoiding the invalid post-stop visibility mutation.

Alternative: emit no terminal writes on quit. Rejected because the shell could inherit pi-vimmode's bar, block, or underline shape.

### Validate routing and side effects separately

Lifecycle tests SHALL table-test `quit`, `reload`, `new`, `resume`, and `fork`, proving only quit disables policy restoration. VimEditor tests SHALL prove terminal-exit reset does not invoke the visibility setter and still emits the default cursor-shape sequence. A manual `/quit` smoke test with default `showHardwareCursor=false` SHALL validate the real Pi/TUI/terminal ordering.

A process-level automated terminal test is rejected as brittle and disproportionate to the narrow seam.

### Align stale busy-bar specification

The visual configuration delta SHALL preserve current canonical behavior: an active bar hardware cursor remains visible during agent work, while block and underline hardware cursors remain suppressed. This is a specification correction, not a new rendering behavior.

## Risks / Trade-offs

- [Pi adds another terminal-exit shutdown reason] → Treat only the known `quit` reason specially; update the typed classification when Pi's public contract changes rather than guessing unknown semantics.
- [Quit path accidentally restores captured `false`] → Cover reason routing and visibility-setter calls independently.
- [Quit path leaves shell with Vim cursor shape] → Assert the default cursor-shape sequence is still emitted.
- [Specification correction appears to expand behavior scope] → Keep code tasks limited to issue #53 unless tests show current busy-bar behavior disagrees with the canonical implementation.

## Migration Plan

No user migration or configuration change is required. Implement the optional reset flag, route shutdown reasons in lifecycle cleanup, update focused tests and specs, then run repository validation and the manual quit smoke test. Rollback is a direct revert of the lifecycle routing and reset option.

## Open Questions

None. Grilling resolved cleanup ownership, reason classification, test scope, specification scope, and manual validation.
