## Context

Pi Vim mode already has a modal editor, shared buffer helpers, visual character mode, visual line mode, inline selection rendering, and tests around buffer/edit/render behavior. Visual block mode should extend those existing seams instead of adding a second editor path.

Current visual state is mode + anchor + cursor. Block mode needs same state shape plus a new selection kind: rectangle bounded by anchor line/column and cursor line/column. Operations must work on prompt text lines, not terminal-wrapped render chunks.

## Goals / Non-Goals

**Goals:**

- Add `visualBlock` as a Vim mode and visual selection kind.
- Enter block mode with `Ctrl-v`; switch among `v`, `V`, and `Ctrl-v` without losing anchor/cursor.
- Render rectangular selections across multi-line prompts with existing ANSI selection/cursor styling and width truncation.
- Implement blockwise `y`, `d`/`x`, and `c` using deterministic rectangular registers.
- Cover buffer math, command handling, rendering, modal flow, and README docs.

**Non-Goals:**

- Multi-cursor insertion (`I`/`A`) for visual blocks.
- Block replace (`r`), case changes, indent shifts, or Ex commands.
- Full Vim virtual-column behavior for tabs/double-width graphemes beyond current prompt renderer assumptions.
- External dependency changes.

## Decisions

### Represent block mode explicitly

Add `visualBlock` to `VimMode`; map visual selection kinds to `char | line | block`.

Rationale: existing mode checks already distinguish visual character and line modes. Explicit mode keeps rendering, status, cursor config, and key dispatch simple.

Alternative considered: store `mode: "visual"` plus `selectionKind`. Rejected because current APIs expose mode directly to rendering/config and would require parallel state everywhere.

### Keep block selection math in buffer helpers

Add helpers such as `normalizeBlockRange`, `isVisualBlockCellSelected`, `yankVisualBlockSelection`, and block delete/change support near existing visual helpers.

Rationale: rectangular selection math is pure text transformation and already belongs in `src/buffer.ts`. Renderer/editor should ask buffer helpers instead of duplicating boundary logic.

Alternative considered: compute block rectangles in render/editor call sites. Rejected because operation and render semantics can drift.

### Use line-joined rectangular register text

For block yank/delete/change, unnamed register type remains `char`; register text is selected slices from each affected line joined with `\n`. Missing columns in short lines contribute empty slices. Delete/change removes selected slices line-by-line and places cursor at top-left selected cell clamped to remaining text.

Rationale: preserves rectangular content without introducing a new register type throughout existing paste code. Future block paste can add a `block` register type if needed.

Alternative considered: add `RegisterType = "block"` now. Rejected because paste semantics are out of scope and this would force incomplete public behavior.

### Reuse renderer chunk pipeline

Extend active visual render input to accept `visualBlock`. Cell selection should be computed against logical line index and column before chunk styling/truncation. Whole-line visual behavior remains unchanged.

Rationale: existing renderer already styles per cell and handles cursor distinction. Block selection can plug into same per-cell predicate.

Alternative considered: render block overlay after chunks are built. Rejected because wrapping/truncation would make logical rectangle semantics harder to preserve.

### Treat `Ctrl-v` as control-key dispatch, not printable text

Handle the same key identity Pi emits for `Ctrl-v` in modal input dispatch and tests. In insert mode, existing Pi behavior should remain unchanged unless Pi already sends paste through a different path.

Rationale: block mode is a normal/visual mode command; insert mode should preserve prompt editing behavior.

Alternative considered: support only a named command or alternate key. Rejected because Vim users expect `Ctrl-v`.

## Risks / Trade-offs

- `Ctrl-v` may conflict with terminal paste in some environments → add tests around Pi key event shape and document any known terminal limitation.
- Tabs/wide graphemes may make visual column rectangles imperfect → keep semantics based on current string-column model and preserve width safety.
- Short lines can make invisible empty selections hard to understand → render only existing cells; operations still include empty slices for stable register shape.
- Block delete on ragged lines can leave cursor out of bounds → clamp cursor through existing position helpers.
- Hidden paste semantics for block registers could surprise users → document y/d/c only; no block paste claim.

## Migration Plan

1. Extend types/config defaults to include `visualBlock` cursor style.
2. Add buffer helpers and tests for block selection, yank, delete, change, and ragged lines.
3. Extend command/input dispatch for `Ctrl-v` enter/switch behavior.
4. Extend renderer and render tests for rectangular highlighting and width safety.
5. Update README keymap and visual mode docs.
6. Run `bun test` and typecheck.

Rollback: remove `visualBlock` mode additions and associated tests/docs; existing visual/visualLine behavior should remain isolated.
