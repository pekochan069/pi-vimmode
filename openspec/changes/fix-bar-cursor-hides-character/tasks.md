## 1. Regression Tests

- [ ] 1.1 Update `test/render.test.ts` so `renderCursorCell("x", "bar")` asserts the rendered cell contains `x`, includes `CURSOR_BAR_START`, and remains one visible cell wide.
- [ ] 1.2 Add/adjust `restyleCursorMarker()` coverage so bar restyling preserves the captured cursor-cell character from Pi-rendered output.
- [ ] 1.3 Add/keep an empty-cell or end-of-line bar cursor assertion that verifies a visible one-cell placeholder without adjacent text loss.

## 2. Rendering Fix

- [ ] 2.1 Update `src/render.ts` so `renderCursorCell(cell, "bar")` styles `safeCell` instead of replacing it with `BAR_CURSOR_GLYPH`.
- [ ] 2.2 Remove now-unused bar cursor glyph code if no remaining render path needs it.
- [ ] 2.3 Verify `block` and `underline` cursor rendering output remains unchanged.

## 3. Validation

- [ ] 3.1 Run `bun test test/render.test.ts` and fix any render regression failures.
- [ ] 3.2 Run `bun test` to confirm full Vim mode test suite passes.
- [ ] 3.3 Run `bun run check-types` to confirm TypeScript still compiles.
