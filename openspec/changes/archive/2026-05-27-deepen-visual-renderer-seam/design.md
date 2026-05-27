## Context

`src/render.ts` already owns the hard parts of active visual rendering: ANSI styling, width-safe wrapping, scroll indicators, selected cell display, empty selected line handling, cursor rendering, and cursor-vs-selection precedence. `src/vim-editor.ts` still reaches across the seam by passing many primitive facts to `renderVisualEditor`: lines, cursor, mode, anchor, cursor style, width, terminal rows, focus, and border color.

This change makes the visual renderer a deeper module. The Pi adapter should decide when the editor is in an active visual mode and then pass one cohesive visual render input. The renderer should derive the active visual view and render rows from that input. Non-visual rendering must continue through `super.render()` so Pi autocomplete, default prompt behavior, and private base rendering stay Pi-owned.

## Goals / Non-Goals

**Goals:**

- Replace the primitive `VisualRenderOptions` fact bag with a cohesive active-visual render input or view-model API.
- Keep wrapping, scrolling, ANSI width, padding, cursor precedence, empty-line highlighting, and visual display decisions local to `src/render.ts`.
- Keep Vim visual selection truth in the prompt buffer API and have the renderer consume narrow selection predicates or derived ranges.
- Shrink `VimEditor.renderEditorLines()` so it only selects visual vs non-visual path and supplies a cohesive visual render request.
- Expand renderer tests around seam-critical behavior and width safety.
- Preserve current user-facing rendering, keymap, cursor styles, status feedback, and validation behavior.

**Non-Goals:**

- Add new Vim commands, selection semantics, cursor styles, or settings.
- Rewrite modal state management or prompt buffer operations.
- Replace Pi's non-visual render path.
- Move terminal cursor escape writing out of the adapter.
- Couple renderer internals to Pi `CustomEditor` instances or private Pi editor state.

## Decisions

### Renderer owns active-visual view construction

Introduce a cohesive input type such as `VisualRenderRequest` or `ActiveVisualRenderInput` that contains the editor snapshot, active visual state, cursor style, viewport data, and display hooks. `renderVisualEditor` can either consume that request directly or build an internal `VisualRenderView` before rendering rows.

Rationale: the adapter should express intent (`render active visual editor`) rather than coordinate every rendering fact. Renderer internals can change without broad adapter churn.

Alternative considered: keep `VisualRenderOptions` and add more tests. Rejected because the seam remains shallow and future visual rendering changes still require adapter awareness.

### Keep non-visual rendering Pi-owned

`VimEditor.renderEditorLines()` should continue to branch: active visual mode with anchor uses the visual renderer; all other modes use `restyleCursorMarker(super.render(width), cursorStyle)`.

Rationale: Pi's base editor owns insert/normal prompt rendering, autocomplete display, and private layout behavior. This change is about visual rendering only.

Alternative considered: route every mode through the custom renderer. Rejected because it increases parity risk and expands scope beyond the TODO.

### Renderer owns display mapping, buffer owns selection truth

The renderer should continue to use a narrow buffer surface for visual selection truth, such as `isVisualCellSelected` and `isVisualLineSelected`, or a similarly focused display-range helper. It should not duplicate Vim range semantics.

Rationale: visual selection correctness belongs with prompt buffer operations; renderer correctness is mapping those selections onto wrapped terminal rows with ANSI styling and cursor precedence.

Alternative considered: move all selection range logic into `src/render.ts`. Rejected because it would split Vim selection semantics away from buffer tests.

### Test exported behavior, not layout internals

Keep chunking, layout lines, scroll windows, and cursor-placement helpers private unless the new view-model API intentionally becomes stable. Add tests through exported renderer behavior for cursor precedence, cursor at end of wrapped content, scroll indicators, empty selected lines, narrow widths, and width safety.

Rationale: tests should guard user-visible renderer contracts without freezing private data structures.

Alternative considered: export layout internals for direct unit tests. Rejected unless debugging shows exported view inspection is needed.

## Risks / Trade-offs

- Render output drift during API cleanup → Preserve existing tests, add focused edge-case tests before broad rewrites, and compare visible width on every rendered line.
- Renderer accidentally owns Vim selection semantics → Keep selection predicates/ranges in `src/buffer.ts` and only consume them from `src/render.ts`.
- Non-visual render behavior regresses → Keep the `super.render()` branch unchanged except for call-site shape.
- ANSI cursor and selection styling break width safety → Use `visibleWidth` assertions in render tests for normal, wrapped, scrolled, narrow, and empty-line cases.
- New API naming overfits current implementation → Name by domain intent (`active visual render`) rather than current layout mechanics.

## Migration Plan

1. Inventory `src/render.ts` exports and all call sites for `renderVisualEditor`, cursor helpers, and `restyleCursorMarker`.
2. Add the cohesive visual render input/view-model API while preserving existing renderer behavior.
3. Update `VimEditor.renderEditorLines()` to pass a single visual render request and keep the non-visual `super.render()` branch intact.
4. Make layout/view helpers private unless the new exported API intentionally exposes them.
5. Add/adjust render tests for cursor precedence, wrapped end cursor, scroll indicators, empty selected lines, narrow widths, and width safety.
6. Run `bun test`, typecheck, and OpenSpec validation; fix regressions without changing user-facing behavior.
7. Roll back by restoring the previous `VisualRenderOptions` entrypoint if the new seam creates unclear coupling during implementation.

## Open Questions

- Should the exported renderer API be one function that accepts a cohesive request, or a two-step `createVisualRenderView` plus `renderVisualEditorView`? Prefer one function unless tests need stable view inspection.
- Should status-line view data stay fully in `modal/view.ts` and `VimEditor`, or should a future change create a shared renderer/status view model? For this change, keep status out of scope.
