## 1. Ex Command Suggestion Source

- [x] 1.1 Add shared finite Ex command candidate data/helper in `src/ex.ts` so parser support and suggestions use one source of truth.
- [x] 1.2 Add suggestion helper tests in `test/ex.test.ts` for empty prefix, command prefix filtering, valid range-prefixed commands, command-argument suppression, and invalid/no-suggestion input.
- [x] 1.3 Add transform-command suggestion tests for enabled defaults, configured aliases, disabled actions, and disabled transform config.

## 2. Modal Ex Completion Behavior

- [x] 2.1 Add command-word completion helper in `src/modal/ex-command-line.ts` that respects `pendingEx.cursor`, preserves range text, clears stale preview state, and no-ops when completion cannot improve input.
- [x] 2.2 Wire `Tab` in pending Ex input to complete a single match or common prefix without changing `Enter`, `Esc`, `Up`, or `Down` behavior.
- [x] 2.3 Add modal tests for single-match completion, common-prefix completion, no-op completion, cursor-in-middle completion, history navigation, substitution preview preservation rules, and visual-source Ex state preservation.
- [x] 2.4 Add side-effect regression tests proving suggestions/completion do not change prompt text, registers, marks, search state, macros, dot-repeat state, cursor position, or Ex history before execution.

## 3. Workbench Rendering

- [x] 3.1 Extend workbench row rendering in `src/vim-editor.ts` or a small view helper to include bounded width-safe suggestion rows below the active Ex command row.
- [x] 3.2 Add render tests for empty-command suggestions, filtered suggestions, narrow-width truncation/padding, and viewport row reservation.
- [x] 3.3 Add live `VimEditor.render` regression tests proving Pi-owned insert autocomplete rows remain visible when Vim status/workbench rows are present.

## 4. Documentation and TODOs

- [x] 4.1 Update `docs/features.md` to document finite Ex command suggestions, `Tab` completion limits, and non-goals for Vimscript/file/path/shell/argument completion.
- [x] 4.2 Update any runtime help or docs drift tests that enumerate Ex command-line behavior.
- [x] 4.3 Mark `TODOs.md` `ex command autocomplete` complete after implementation and validation pass.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate --specs --strict`.
