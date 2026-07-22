## 1. Modal State and Effects

- [x] 1.1 Add focused `test/modal.test.ts` coverage proving case-insensitive prompt-wide matching builds only `{ label, line, character }` metadata, stops at 52 lowercase-then-uppercase labels, clears on no match, and emits no `edit` effect.
- [x] 1.2 Add modal tests proving `Escape`, valid labels, and invalid labels never emit `edit`; valid labels clear pending state and emit only cursor restoration plus invalidation, while invalid labels retain highlight state.
- [x] 1.3 Seed representative registers, marks, macro, dot-repeat, search, visual-history, and Ex-message state in one focused modal regression and verify EasyMotion entry/cancel/selection does not mutate it.
- [x] 1.4 Remove the unreachable EasyMotion `jump` union variant and all handler/status branches after confirming no constructor exists; retain only `char` and `highlight` states with render metadata.

## 2. Render and View

- [x] 2.1 Expand `test/render.test.ts` coverage for visual label substitution, configured ANSI color plus reset, multiline targets, wide-cell width preservation, cursor/selection precedence, and EasyMotion precedence over search highlighting.
- [x] 2.2 Verify and complete `src/render.ts` so target coordinates resolve to label glyphs over immutable snapshot cells, preserve cell width, and do not maintain restoration text or mutate copied prompt lines.

## 3. Adapter and Live Editor

- [x] 3.1 Add `test/vim-editor.test.ts` flows proving highlight, `Escape`, valid selection, invalid selection, no-match input, and lowercase/uppercase labels leave prompt text unchanged; valid labels alone move cursor.
- [x] 3.2 Add live-editor history regressions proving undo after EasyMotion immediately reverses the prior real edit and redo survives EasyMotion open/cancel.
- [x] 3.3 Verify and complete `src/vim-editor.ts` render input so every target label and coordinate reaches `src/render.ts`, with no EasyMotion text recovery, synthetic undo, or redo clearing.

## 4. Configuration and Documentation

- [x] 4.1 Confirm focused config/live-editor tests preserve no default EasyMotion binding, configured command resolution, configured `labelColor`, and existing protected Pi shortcut behavior without adding settings or clone paths.
- [x] 4.2 Document opt-in prompt-wide EasyMotion behavior, render-only labels, 52-target limit, and label color in `docs/features.md`; replace stale README claims about `f`/`t`/`F`/`T`, current-line replacement, and restoration with a concise accurate summary/link.

## 5. Manual Release Gate

- [ ] 5.1 With prompt `banana apple alpha`, invoke configured EasyMotion for `a`, press `Escape`, then repeat with several valid labels; verify text stays byte-identical and cursor reaches each selected target.
- [ ] 5.2 Create a real edit, undo it, open and cancel EasyMotion, then redo; verify the real edit returns immediately and no label text enters prompt history.
- [ ] 5.3 Manually verify multiline targets, no match, invalid label, lowercase/uppercase labels, 52+ matches, and custom `piVimMode.easymotion.labelColor`; keep release blocked if any case fails.

## 6. Validation

- [x] 6.1 Run `bun test`.
- [x] 6.2 Run `bun run check-types`.
- [x] 6.3 Run `bun run lint`.
- [x] 6.4 Run `bun run format:check`.
- [x] 6.5 Run `openspec validate --specs --strict` and `openspec validate render-only-easymotion-labels --type change --strict`.
