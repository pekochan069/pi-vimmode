## 1. Command Model and Buffer Helpers

- [ ] 1.1 Extend command/result types to represent pending `d`/`c`/`y`, `gg`, operator-motion commands, line aliases, and paste-before.
- [ ] 1.2 Update `parseNormalCommand` to parse `gg`, `cc`, `dd`, `yy`, operator motions (`w`, `b`, `0`, `^`, `$`), and invalid pending combinations.
- [ ] 1.3 Add pure buffer helpers for first non-blank column, open-line-above/below, join-line, operator range selection, yank range, and paste-before.
- [ ] 1.4 Add unit tests for parser and buffer helpers, including empty prompt and invalid pending edge cases.

## 2. Editor Keybinding Implementation

- [ ] 2.1 Wire normal-mode `gg`, `G`, `_`, and `^` navigation into `VimEditor`.
- [ ] 2.2 Wire normal-mode `o` and `O` to create blank lines and enter insert mode.
- [ ] 2.3 Wire `d`/`c`/`y` operator-motion commands and `D`/`C`/`Y` aliases to register-aware edit behavior.
- [ ] 2.4 Wire `cc`, `J`, and `P` behavior while preserving existing `dd`, `yy`, `p`, visual, and Pi shortcut delegation behavior.
- [ ] 2.5 Wire `%` navigation
- [ ] 2.6 Add editor integration tests for each new normal-mode keybinding group and regression tests for existing Vim behavior.

## 3. Documentation and Validation

- [ ] 3.1 Update `README.md` keymap with new navigation, open-line, operator-motion, alias, join, and paste-before commands.
- [ ] 3.2 Document scope limits for counts, text objects, full Vim grammar, and edge-case semantics.
- [ ] 3.3 Run `bun test` and fix failures.
- [ ] 3.4 Run `bun run check-types` and fix failures.
