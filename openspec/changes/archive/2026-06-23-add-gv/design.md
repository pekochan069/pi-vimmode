## Context

pi-vimmode already stores the active visual anchor in modal state and derives the active cursor from the current editor snapshot. Leaving visual mode clears transient state through `resetTransientState`, so there is no durable record for Vim's `gv` reselect behavior.

`gv` is prompt-local state-machine behavior. It should stay inside modal/keymap seams and avoid adapter changes except normal effect application already used by mode switches and cursor restoration.

## Goals / Non-Goals

**Goals:**

- Add normal-mode `gv` that re-enters the last visual mode with the previous anchor and active cursor.
- Preserve visual kind: characterwise, linewise, or blockwise.
- Keep behavior finite, typed, and configurable through existing semantic keymap plumbing.
- Make stale/missing previous selections safe no-ops.
- Document and test behavior.

**Non-Goals:**

- No multi-entry visual selection history.
- No full Vim mark semantics for `'<` and `'>` beyond existing visual Ex capture.
- No cross-editor or cross-session selection persistence.
- No new settings family or runtime dependency.

## Decisions

### Store one typed last visual selection in modal state

Add `lastVisualSelection?: { mode; anchor; cursor }` to `ModalState`, where `mode` is one of `visual`, `visualLine`, or `visualBlock`.

- Target seams: `src/modal/types.ts`, `src/modal/state.ts`, visual exit helpers.
- Alternative: store only a line range. Rejected because `gv` must preserve characterwise/blockwise anchor and active cursor.
- Alternative: reuse Ex visual capture. Rejected because Ex capture is pending-command state, line-oriented, and not always present.

### Capture on visual completion/cancel before transient visual state clears

When an active visual selection exits to normal/insert because of `Esc`, configured escape aliases, yank/delete/change/case/replace/paste/block insert, or visual prompt actions, capture the current mode, anchor, and snapshot cursor before clearing `visualAnchor`.

- Target seams: `src/modal/visual.ts`, `src/modal/engine.ts`, `src/modal/core.ts` if a small shared helper avoids repeated spread logic.
- Alternative: change `modeUpdate` to always know the cursor. Rejected because it would widen a core helper signature across unrelated mode transitions.
- Alternative: update active cursor in modal state on every visual motion. Rejected because snapshot cursor already owns cursor truth and adding mirrored state risks drift.

### Implement `gv` as a normal semantic command

Add a `reselectVisual` command action with default `gv`. Normal dispatch validates the stored selection against current prompt lines, restores cursor to the saved active cursor, sets `visualAnchor`, and enters the saved visual mode.

- Target seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/modal/normal.ts`, `src/commands.ts` through existing descriptor-driven resolution.
- Alternative: hard-code `g` then `v` in modal engine. Rejected because keymap configuration and multi-key parser already solve this.
- Alternative: make `gv` unavailable for configuration. Rejected because current roadmap keybindings participate in semantic keymap configuration.

### Treat invalid stored positions as no-op

Before reselecting, require both stored positions to be within the current prompt line count and line lengths. If invalid or missing, leave text/cursor/registers/marks/search unchanged and provide normal no-op feedback when enabled.

- Target seams: `src/modal/normal.ts` helper near command handling.
- Alternative: clamp stale positions. Rejected because clamping can select unintended text after edits.

## Risks / Trade-offs

- Capture missed on one visual exit path → `gv` feels inconsistent. Mitigation: tests cover escape, yank/delete, visual kind switches, and block insert entry.
- Stale selection after edits may no-op more often than Vim. Mitigation: explicit prompt-local safety beats surprising selection; document exact behavior.
- New `gv` binding conflicts with user config only if they already mapped `gv`. Mitigation: existing deterministic keymap conflict handling applies.
- Modal helpers may grow branches. Mitigation: extract tiny capture/restore helpers instead of adding broad engine logic.

## Migration Plan

1. Add modal state type and preservation through `resetTransientState`.
2. Add capture helper and wire visual exit paths.
3. Add `reselectVisual` command descriptor/default binding and normal-mode handler.
4. Add tests and docs.
5. Rollback by removing `reselectVisual`, last-selection state, tests, and docs; no data migration required.

## Open Questions

None.
