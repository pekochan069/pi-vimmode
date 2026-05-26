## 1. Configuration Foundation

- [x] 1.1 Add `VimMode`, `CursorStyle`, and editor options types for `insert`, `normal`, `visual`, and `visualLine` modes.
- [x] 1.2 Create a config module with defaults for `piVimMode.startMode` and `piVimMode.cursor`.
- [x] 1.3 Implement read-only config loading from global and project Pi settings files with project values overriding global values.
- [x] 1.4 Add config parser tests for defaults, valid overrides, invalid startup modes, invalid cursor styles, and malformed settings JSON.
- [x] 1.5 Pass parsed Vim editor options from the extension entrypoint into each `VimEditor` instance.

## 2. Visual Line State and Pure Buffer Operations

- [x] 2.1 Extend editor mode state and public mode inspection to include `visualLine`.
- [x] 2.2 Add pure helpers for inclusive line range normalization from visual anchor and active cursor.
- [x] 2.3 Add pure helpers for linewise visual selection text extraction.
- [x] 2.4 Add pure helpers for linewise visual delete/change that return updated text, linewise register contents, and target cursor.
- [x] 2.5 Add buffer tests for single-line, multi-line, reversed, and whole-buffer visual line selections.

## 3. Visual Line Key Handling

- [x] 3.1 Implement normal-mode `V` to enter visual line mode with current line as anchor.
- [x] 3.2 Implement visual-mode `V` to switch from characterwise visual mode to visual line mode without resetting the anchor.
- [x] 3.3 Implement visual-line-mode `v` to switch back to characterwise visual mode without resetting the anchor.
- [x] 3.4 Reuse supported motion keys in visual line mode to extend the selected line range.
- [x] 3.5 Implement visual line `y`, `d`/`x`, and `c` using linewise helpers and existing unnamed register semantics.
- [x] 3.6 Ensure visual line `Esc`, submit, and Pi-owned control shortcuts clear transient state or delegate consistently with existing visual mode.

## 4. Visual Highlight Rendering

- [x] 4.1 Add a testable render view-model helper that maps logical lines, wrapped display lines, selection ranges, and cursor position.
- [x] 4.2 Implement characterwise visual selection highlighting with width-safe ANSI styling.
- [x] 4.3 Implement visual line highlighting across every selected full line, including wrapped display lines.
- [x] 4.4 Preserve cursor visibility when the cursor falls inside a highlighted selection.
- [x] 4.5 Keep non-visual render behavior on the existing `super.render(width)` path.
- [x] 4.6 Add render tests for width limits, reversed selections, multiline selections, wrapped selections, and narrow widths.

## 5. Cursor Style Support

- [x] 5.1 Add cursor style rendering for `block`, `bar`, and `underline` in the visual render helper.
- [x] 5.2 Apply configured cursor style per active mode, including `visualLine`.
- [x] 5.3 Send best-effort DECSCUSR terminal cursor-shape hints on mode transitions and editor install.
- [x] 5.4 Reset terminal cursor shape on session shutdown or extension teardown when possible.
- [x] 5.5 Add tests for mode-specific cursor style selection and fallback behavior.

## 6. Documentation and Compatibility

- [x] 6.1 Update README mode/keymap docs for `V`, visual line operations, and inline visual selection highlighting.
- [x] 6.2 Document `piVimMode.startMode` and `piVimMode.cursor` settings with global/project examples.
- [x] 6.3 Document invalid-setting fallback behavior and supported cursor style values.
- [x] 6.4 Confirm Pi shortcut compatibility for insert, normal, visual, and visual line modes.
- [x] 6.5 Update limitations to keep block visual mode and full Neovim cursor option parity out of scope.

## 7. Validation

- [x] 7.1 Run `bun test` and fix failures.
- [x] 7.2 Run `bun run check-types` and fix type errors.
- [ ] 7.3 Manually smoke test in Pi: visual highlight, visual line `V`, linewise yank/delete/change, startup mode config, cursor style config, prompt submit, autocomplete, and interrupt behavior.
