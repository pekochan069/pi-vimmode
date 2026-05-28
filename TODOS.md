# TODOs

## Architecture deepening opportunities

1. [x] Deepen `VimEditor` into Pi Adapter + modal editing Module
   - Files: `src/vim-editor.ts`, `src/commands.ts`, `src/buffer.ts`, `test/vim-editor.test.ts`
   - Problem: `VimEditor` mixes Pi `CustomEditor` Adapter, mode machine, pending operator, register, command execution, cursor restore, render/status, terminal cursor.
   - Solution: Keep Pi prompt editor Adapter concrete. Move modal editing behavior into deeper Module.
   - Benefits: Better locality for mode/register/pending bugs; more leverage from tests through one prompt-editing Interface; less integration-test burden.

2. [x] Deepen `buffer.ts` from helper pile into prompt buffer operation Module
   - Files: `src/buffer.ts`, `src/vim-editor.ts`, `src/render.ts`, `test/buffer.test.ts`
   - Problem: Many exported helpers expose range math, selection details, and register semantics; Interface drifting shallow.
   - Solution: Hide low-level helpers behind deeper prompt buffer operations: navigation, visual operation, linewise operation, operator-motion operation, paste.
   - Benefits: Off-by-one and cursor placement bugs gain locality; future commands get leverage without callers composing internals.

3. [x] Deepen visual renderer seam
   - Files: `src/render.ts`, `src/vim-editor.ts`, `test/render.test.ts`
   - Problem: Visual renderer mirrors Pi private render behavior: wrapping, scrolling, ANSI width, cursor precedence; `VimEditor` passes many facts.
   - Solution: Make renderer own active-visual view model more completely; keep non-visual `super.render()` path.
   - Benefits: Rendering bugs gain locality; visual features reuse one tested Module.

4. [x] Extract lifecycle/settings install Module if reload bugs recur
   - Files: `src/index.ts`, `src/config.ts`
   - Problem: Small file encodes subtle Pi lifecycle behavior: stable factory, delayed reinstall, multi-hook install, terminal cursor reset.
   - Solution: Only deepen when lifecycle changes again; keep config Module pure.
   - Benefits: Startup/reload bugs localize without over-abstracting current readable code.

- [x] line, column number
- [x] visual block
- [x] macro
- [x] registers
- [x] mark
- [x] Ctrl+a, Ctrl+x, ...
- [x] `/` search
- [ ] Ex commands (things starts with `:`)
- [ ] `~`

## Ex Commands

- [ ] Add regex-capable Ex substitution after literal v1 ships
- [ ] Add remaining Vim Ex substitution flags after v1 `g`/`i` support
- [ ] Add Ex range offset addresses like `.+1` and `$-2`
- [ ] Add Ex semicolon range support after comma-only v1
- [ ] Add Ex command history and repeat-substitution commands after v1
- [ ] Reuse full prompt editor for Ex command-line editing after minimal v1 ships

- [ ] Extract oversized modal command handlers
  - Files: `src/modal/engine.ts`, `test/modal.test.ts`, `test/vim-editor.test.ts`
  - Problem: `applyCommand`, `handleNormalInput`, and `handleVisualInput` exceed project 100-line guideline after Ex/search/keymap expansion, making state-machine changes harder to review.
  - Solution: Extract command-specific branches/private helpers while preserving behavior and current tests.
  - Benefits: Smaller review surface for modal bugs; less regression risk when adding Ex/search/visual behavior.
