## Context

`src/vim-editor.ts` currently switches between Pi's default `CustomEditor` rendering and the extension renderer. Visual mode always uses `renderVisualEditor()` so selected text can be highlighted; normal/insert mode often uses `super.render()`. For prompts taller than the visible input box, those render paths can choose different top rows, so mode changes appear to jump even when cursor and prompt text did not move.

`src/render.ts` also derives the visible window directly from the cursor each render. That keeps the cursor visible, but it can make every vertical motion become a viewport motion, including `j` near the top of a visual selection.

## Goals / Non-Goals

**Goals:**

- Keep one prompt viewport offset across normal/visual render transitions while the cursor remains visible.
- Scroll only enough to reveal the cursor after motion leaves the current visible window.
- Keep selection/search/cursor/status rendering width-safe.
- Add focused regressions for long prompts; avoid broad renderer rewrites.

**Non-Goals:**

- No full Vim viewport feature set (`zz`, `zt`, `zb`, scrolloff, folds, window-local commands).
- No new settings, keybindings, or dependencies.
- No change to prompt text operations, registers, marks, dot-repeat, search state, Ex messages, or Pi shortcut delegation.

## Decisions

1. **Store minimal viewport offset in `VimEditor`, not modal state.**
   - Target seams: `src/vim-editor.ts`, `src/render.ts`.
   - Rationale: viewport position is adapter/render state, not Vim command semantics. Keeping it out of `ModalState` avoids polluting buffer/edit logic and macro replay.
   - Alternative rejected: store offset in modal state. That would make render-only behavior affect modal tests and command history without product value.

2. **Add a pure render helper that preserves previous offset when cursor remains visible.**
   - Target seam: `src/render.ts`.
   - Rationale: current `scrollWindow()` can be replaced or wrapped with `resolveViewportOffset(layout, cursor, maxVisible, previousOffset)` behavior: clamp offset, keep it if cursor is inside `[offset, offset + maxVisible)`, otherwise move just enough to show the cursor.
   - Alternative rejected: always center the cursor. Centering still jumps on mode changes and adds Vim-like viewport policy not requested.
   - Alternative rejected: force visual mode through `super.render()`. That loses visual-selection highlighting and search/selection composition.

3. **Apply stable viewport to prompt and visual render paths only when using extension renderer.**
   - Target seams: `renderPromptEditor()`, `renderVisualEditor()`, `VimEditor.renderEditorLines()`.
   - Rationale: insert mode and autocomplete should keep delegating to Pi. Extension rendering already handles visual/search/Ex/workbench states; viewport offset should only affect those rows.
   - Alternative rejected: replace all `super.render()` paths. Bigger blast radius; autocomplete and default insert rendering already work.

4. **Test at render-helper and live-editor boundaries.**
   - Target seams: `test/render.test.ts`, `test/vim-editor.test.ts`.
   - Rationale: pure tests catch offset math; live editor tests catch mode transition regressions caused by adapter path switching.
   - Alternative rejected: manual-only verification. The bug appears only with over-height prompts, so regression tests are cheap and valuable.

## Risks / Trade-offs

- Stored offset can go stale after text shrink or terminal resize → clamp offset against current layout length before rendering.
- Default Pi render and extension render may still differ in border/status row details → assert stable prompt content rows, not exact ANSI decoration, where needed.
- Wrapped wide characters can change layout row counts → keep using existing `visibleWidth()` and `layoutLines()` logic; add no separate wrapping implementation.
- Workbench rows reduce prompt viewport height → continue passing reduced `terminalRows` from `VimEditor.render()` and test one constrained viewport case.

## Migration Plan

1. Add pure viewport-offset calculation in `src/render.ts` and keep current rendering output shape.
2. Thread optional viewport offset through prompt/visual render inputs.
3. Store/update the offset in `VimEditor` before extension-rendered prompt/visual rows.
4. Add regressions for visual enter/exit and visual `j` in long prompts.
5. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback: remove the stored offset and optional render input; existing cursor-visible rendering behavior returns.

## Open Questions

None.
