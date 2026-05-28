## Context

`src/render.ts` owns fake cursor rendering for visual render paths and `restyleCursorMarker()` for Pi-rendered prompt output. `renderCursorCell()` currently renders `bar` as a styled `▌` glyph, which replaces the cursor cell instead of styling the real cell. This preserves render width, but it hides the character under the cursor.

The extension already sends DECSCUSR cursor-shape hints through `cursorShapeEscape("bar")`, so the actual terminal cursor can remain a vertical bar while the rendered text cell stays visible. The fake cursor path only needs a width-safe visual marker that does not replace content.

## Goals / Non-Goals

**Goals:**

- Render `bar` cursor cells without removing or hiding the underlying character.
- Preserve one-cell render width for normal text cells and cursor-at-end empty cells.
- Keep `block`, `underline`, search highlight, and visual selection behavior unchanged except where they compose with `bar` cursor styling.
- Add regression tests around `renderCursorCell()` and marker restyling so hidden-character regressions fail fast.

**Non-Goals:**

- Add new cursor styles or config keys.
- Change default cursor style mapping.
- Rework terminal cursor-shape lifecycle or Pi editor adapter architecture.
- Guarantee identical visual appearance across terminal emulators beyond preserving text visibility and width safety.

## Decisions

### Render `bar` by styling the existing cell, not replacing it

Change `renderCursorCell(cell, "bar")` to wrap `safeCell` in the bar cursor style instead of returning the `BAR_CURSOR_GLYPH`. For empty/end-of-line cursor cells, continue rendering a styled space.

Rationale: the cursor cell remains exactly one visible cell wide and the character stays readable. Existing terminal cursor-shape hints still provide the real vertical-bar cursor in focused terminals.

Alternatives considered:

- Keep `▌` and append/prepend the real character: rejected because it changes visible width or requires fragile cursor movement escape sequences.
- Use combining characters or zero-width tricks: rejected because terminal support is inconsistent.
- Remove fake bar styling entirely: rejected because unfocused/render-only paths should still have a visible cursor cue.

### Test behavior at the rendering boundary

Update tests to assert that `renderCursorCell("x", "bar")` contains `x`, contains `CURSOR_BAR_START`, and does not contain/replace with `▌`. Add marker restyle coverage to ensure Pi-rendered cells keep their captured content after bar restyling.

Rationale: the bug is isolated to the render boundary, and boundary tests avoid coupling to unrelated modal/editor behavior.

Alternatives considered:

- Only add end-to-end editor render tests: rejected because failures would be harder to diagnose and could miss direct helper regressions.

## Risks / Trade-offs

- Bar fake cursor may look less like a vertical bar in non-focused snapshots → Mitigation: rely on terminal DECSCUSR in focused terminals and keep bold/visible styling as fallback.
- ANSI nesting with existing cursor marker output could strip style from captured cells → Mitigation: test `restyleCursorMarker()` with captured styled and plain cells.
- Wide-character cursor cells may have terminal-specific styling quirks → Mitigation: preserve current width accounting and add/keep width-safety coverage.

## Migration Plan

No data migration or config migration required. Ship as a rendering fix. Rollback is reverting the small `src/render.ts` change plus tests.

## Open Questions

None.
