## Why

Long prompts that exceed the visible prompt box currently jump the viewport when entering or leaving visual mode, and visual-mode vertical motion near the top can scroll the whole input unexpectedly. This makes selecting text in multi-row prompts disorienting and risks editing the wrong visible region.

## What Changes

- Keep the prompt viewport stable when switching between normal and visual modes without moving the cursor.
- Keep visual-mode `j`/down movement from scrolling the input box until the cursor actually leaves the visible prompt viewport.
- Preserve existing cursor movement, selection highlighting, search highlighting, status, and width-safe rendering.
- Add regression coverage for over-height prompts and visual-mode viewport behavior.

### Non-goals

- No full Vim viewport model, `zz`/`zt`/`zb`, scrolloff, or separate user-configurable scroll settings.
- No new keybindings or runtime dependencies.
- No changes to insert-mode delegation or Pi autocomplete rendering.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-mode-editor`: visual-mode rendering and vertical movement keep the visible prompt viewport stable for prompts taller than the input box.

## Impact

- Code seams: `src/render.ts` prompt viewport calculation, `src/vim-editor.ts` CustomEditor render adapter, and focused modal/render tests as needed.
- Specs: delta requirement under `vim-mode-editor`.
- Tests: add render and/or `VimEditor` regressions for visual enter/exit and top-of-viewport `j` behavior on long prompts.
- Docs: update user-facing behavior docs only if visible behavior wording exists.
- Dependencies/API: no new runtime dependencies, no public API changes, no breaking changes.
