## 1. Package Setup

- [ ] 1.1 Add `pi.extensions` package metadata pointing to `./src/index.ts`.
- [ ] 1.2 Add runtime dependencies for documented Pi extension/TUI imports if local type resolution requires them.
- [ ] 1.3 Add `test` script using `bun test` while keeping `check-types` available.
- [ ] 1.4 Replace Bun starter README content with extension purpose, install/loading instructions, supported keymap, validation commands, and v1 limitations.

## 2. Pure Vim State and Buffer Logic

- [ ] 2.1 Add shared types for Vim mode, cursor position, text range, register, and linewise/charwise operations.
- [ ] 2.2 Implement text range normalization and selected-text extraction across single-line and multi-line prompts.
- [ ] 2.3 Implement charwise range delete/change helpers that return updated text, register contents, and target cursor position.
- [ ] 2.4 Implement linewise `dd`, `yy`, and `p` helpers that preserve an editable prompt after deleting the only line.
- [ ] 2.5 Implement command parser support for single-key commands and two-key commands such as `dd` and `yy`.

## 3. Vim Editor Integration

- [ ] 3.1 Create `src/index.ts` extension entrypoint that registers the Vim editor on `session_start` with `ctx.ui.setEditorComponent()`.
- [ ] 3.2 Implement `VimEditor extends CustomEditor` with insert mode as the startup/default mode.
- [ ] 3.3 Implement insert-to-normal transition on `Esc` while delegating all other insert-mode input to `super.handleInput(data)`.
- [ ] 3.4 Implement normal-mode movement commands `h`, `j`, `k`, `l`, `0`, `$`, `w`, and `b` through public editor key sequences.
- [ ] 3.5 Implement normal-mode insert transitions `i`, `a`, `I`, and `A` with correct cursor positioning.
- [ ] 3.6 Implement normal-mode edits `x`, `dd`, `yy`, `p`, and `u` using pure helpers or delegated Pi editor behavior.
- [ ] 3.7 Implement cursor restoration after structural edits using only public editor APIs and movement sequences.

## 4. Visual Mode

- [ ] 4.1 Add visual-mode state with anchor cursor tracking and normalized active selection range.
- [ ] 4.2 Implement `v` to enter visual mode and `Esc` to cancel visual mode back to normal mode.
- [ ] 4.3 Reuse supported motion keys in visual mode to extend the active selection.
- [ ] 4.4 Implement visual `y` to copy selected text to the unnamed register and return to normal mode.
- [ ] 4.5 Implement visual `d`/`x` to delete selected text, update the unnamed register, restore cursor, and return to normal mode.
- [ ] 4.6 Implement visual `c` to delete selected text, update the unnamed register, restore cursor, and enter insert mode.

## 5. Pi Compatibility and Rendering

- [ ] 5.1 Ensure unmapped printable keys in normal/visual mode are ignored rather than inserted.
- [ ] 5.2 Ensure unknown control and non-printable sequences delegate to `super.handleInput(data)` for Pi app shortcuts.
- [ ] 5.3 Preserve insert-mode prompt submission, newlines, autocomplete, slash-command completion, image paste, external editor, clear, exit, model, and thinking shortcuts.
- [ ] 5.4 Add width-safe `INSERT`, `NORMAL`, and `VISUAL` mode feedback to the editor render output.
- [ ] 5.5 Add visual selection size/range feedback without requiring full selection highlighting.

## 6. Tests and Validation

- [ ] 6.1 Add Bun tests for range normalization and selected-text extraction.
- [ ] 6.2 Add Bun tests for charwise visual delete/change/yank behavior.
- [ ] 6.3 Add Bun tests for linewise delete/yank/paste behavior.
- [ ] 6.4 Add Bun tests for command parser behavior, including pending `d`/`y` commands and ignored printable keys.
- [ ] 6.5 Run `bun test` and fix failures.
- [ ] 6.6 Run `bun run check-types` and fix type errors.
- [ ] 6.7 Manually smoke test the extension in Pi with mode switching, normal edits, visual delete/yank/change, prompt submit, and normal-mode `Esc` interrupt behavior.
