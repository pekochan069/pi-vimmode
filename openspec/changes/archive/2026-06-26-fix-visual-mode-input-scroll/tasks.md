## 1. Render Viewport Helper

- [x] 1.1 Add focused `test/render.test.ts` coverage for preserving previous viewport offset while the cursor remains visible.
- [x] 1.2 Add focused `test/render.test.ts` coverage for minimal scrolling when the cursor moves below the visible prompt rows.
- [x] 1.3 Implement pure viewport offset resolution in `src/render.ts` using existing layout and width logic.
- [x] 1.4 Thread optional viewport offset through `renderPromptEditor()` and `renderVisualEditor()` without changing output shape.

## 2. VimEditor Integration

- [x] 2.1 Add `test/vim-editor.test.ts` regression for entering visual mode in an over-height prompt without changing the top visible prompt row.
- [x] 2.2 Add `test/vim-editor.test.ts` regression for visual `j`/`Down` inside the visible viewport without scrolling the top row.
- [x] 2.3 Store and clamp a minimal prompt viewport offset in `src/vim-editor.ts` for extension-rendered prompt/visual rows.
- [x] 2.4 Preserve insert-mode delegation, autocomplete rendering, search highlights, visual selection, cursor styling, and workbench-row viewport reduction.

## 3. Documentation and Spec Hygiene

- [x] 3.1 Check `docs/features.md` for existing long-prompt or visual-mode viewport wording and update only if needed.
- [x] 3.2 Confirm no settings docs update is needed because this change adds no configuration.

## 4. Validation

- [x] 4.1 Run `bun test`.
- [x] 4.2 Run `bun run check-types`.
- [x] 4.3 Run `bun run lint`.
- [x] 4.4 Run `bun run format:check`.
- [x] 4.5 Run `openspec validate --specs --strict`.
