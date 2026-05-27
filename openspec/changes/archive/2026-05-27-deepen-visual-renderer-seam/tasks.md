## 1. Renderer Seam Inventory

- [x] 1.1 Inventory `src/render.ts` exports and all call sites for `renderVisualEditor`, `restyleCursorMarker`, `renderCursorCell`, cursor constants, and cursor escape helpers.
- [x] 1.2 Classify current `VisualRenderOptions` fields as adapter-owned inputs, renderer-owned derived facts, viewport data, or display hooks.
- [x] 1.3 Confirm no implementation task needs to change non-visual `super.render()` behavior or user-facing visual selection semantics.

## 2. Renderer API and View Model

- [x] 2.1 Define a cohesive active-visual render input type that groups prompt snapshot/content, visual state, cursor style, viewport data, and display hooks.
- [x] 2.2 Refactor `renderVisualEditor` so `src/render.ts` owns active visual view construction from the cohesive input.
- [x] 2.3 Keep layout chunking, wrapping, scroll window calculation, cursor placement, padding, and indicator rendering private unless a stable exported view model is intentionally introduced.
- [x] 2.4 Keep visual selection truth delegated to the narrow prompt buffer API rather than reimplementing Vim selection range semantics in the renderer.

## 3. Pi Adapter Integration

- [x] 3.1 Update `VimEditor.renderEditorLines()` to pass one cohesive active-visual render request when mode is `visual` or `visualLine` with an anchor.
- [x] 3.2 Preserve the non-visual branch as Pi base rendering through `super.render(width)` plus cursor marker restyling.
- [x] 3.3 Keep status border and modal status derivation in the existing `VimEditor`/`modal/view.ts` boundary unless required for the renderer seam.
- [x] 3.4 Remove obsolete fact-bag types or imports after call sites use the new renderer API.

## 4. Render Test Coverage

- [x] 4.1 Add or update tests proving cursor style wins when the cursor cell is inside a visual selection.
- [x] 4.2 Add or update tests for cursor rendering at the end of the last wrapped chunk.
- [x] 4.3 Add or update tests for visual line empty-line highlighting through the new renderer API.
- [x] 4.4 Add or update tests for scroll indicators when terminal row constraints hide visual render chunks above or below the cursor.
- [x] 4.5 Keep or expand width-safety assertions for narrow, wrapped, empty-line, cursor, and scrolled visual output.

## 5. Validation and Cleanup

- [x] 5.1 Run `bun test` and fix regressions without changing user-facing behavior.
- [x] 5.2 Run the project typecheck script if present and fix type errors.
- [x] 5.3 Run OpenSpec validation for `deepen-visual-renderer-seam` and fix artifact issues.
- [x] 5.4 Update `TODOS.md` only after implementation is complete and validated.
