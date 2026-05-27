## Why

Visual rendering currently mirrors Pi private render behavior for wrapping, scrolling, ANSI width, cursor precedence, and selection styling while `VimEditor` passes a bag of low-level facts. Deepening the renderer seam localizes visual rendering bugs in one tested module while preserving Pi's default render path outside visual modes.

## What Changes

- Refactor the visual renderer API around a cohesive active-visual render input/view model instead of separate primitive facts from `VimEditor`.
- Move active visual view derivation for layout, wrap chunks, scroll window, selected cells/lines, empty-line highlighting, cursor precedence, padding, and width-safe indicators into `src/render.ts`.
- Keep non-visual rendering delegated through `super.render()` plus cursor marker restyling.
- Keep visual selection truth in the prompt buffer API; renderer owns display mapping, not Vim selection semantics.
- Expand render tests for cursor precedence, cursor-at-end wrapped chunks, scroll indicators, empty selected lines, narrow widths, and visual width safety.
- Preserve current user-facing Vim behavior, keymap, cursor styles, and status feedback; no breaking changes.

## Capabilities

### New Capabilities

- _None._

### Modified Capabilities

- `vim-editor-adapter-architecture`: Rendering boundary deepens so the Pi adapter supplies one cohesive visual render input while the renderer owns active visual view construction and width-safe visual output.

## Impact

- Affected files: `src/render.ts`, `src/vim-editor.ts`, `test/render.test.ts`, and architecture specs for the render/adapter boundary.
- Public behavior should remain unchanged.
- No new runtime dependencies expected.
