## 1. Register State and Helpers

- [x] 1.1 Extend shared/modal types with named edit register slots, one-shot register target state, and optional test accessors without changing existing unnamed register shape.
- [x] 1.2 Add pure helpers for valid alphabetic slot detection, lowercase normalization, uppercase append detection, target clearing, and pending target display if status needs it.
- [x] 1.3 Add shared write-through helper that always updates the unnamed register and optionally writes/appends to the targeted named register.
- [x] 1.4 Add append helper rules for missing registers, characterwise concatenation, linewise newline joining, and mixed-type linewise results.
- [x] 1.5 Add shared read helper that returns the targeted named register for prefixed paste or the unnamed register for unprefixed paste.

## 2. Modal Engine Integration

- [x] 2.1 Teach normal-mode input handling to enter register-target prefix state on `"`, accept `a-z`/`A-Z`, reject unsupported targets safely, and preserve existing operator/keymap pending behavior.
- [x] 2.2 Route normal-mode yank/delete/change commands (`x`, `dd`, `cc`, `yy`, `D`, `C`, `Y`, and operator-motion forms) through named-register write helpers.
- [x] 2.3 Route normal-mode `p` and `P` through named-register read helpers while preserving existing characterwise and linewise paste behavior.
- [x] 2.4 Teach visual, visual-line, and visual-block input handling to accept `"{slot}` before supported `y`, `d`, `x`, and `c` operations.
- [x] 2.5 Route visual, visual-line, and visual-block yank/delete/change results through named-register write helpers.
- [x] 2.6 Route existing visual-line paste replacement through named-register read helpers where prefixed paste is supported.
- [x] 2.7 Ensure all register targets are consumed after the next supported command or safe no-op and never leak into later commands.

## 3. Tests

- [x] 3.1 Add modal/helper tests for slot validation, lowercase normalization, uppercase append, mixed-type append, read selection, and target clearing.
- [x] 3.2 Add normal-mode tests for `"ayy`, `"add`, `"ayw`, `"ax`, one-shot target clearing, unprefixed paste still using unnamed register, and named `p`/`P` paste.
- [x] 3.3 Add visual-mode tests for characterwise, linewise, and blockwise named-register yank/delete/change behavior.
- [x] 3.4 Add safety tests for missing named register paste, incomplete prefix, unsupported target, and prefix before unsupported command.
- [x] 3.5 Add macro-separation regression tests if macro recording support is present in the implementation branch; otherwise keep the spec scenario documented for the macro branch to cover.
- [x] 3.6 Add `VimEditor` integration coverage or test helpers proving named registers persist for the editor session and remain separate from the unnamed register.

## 4. Documentation and TODOs

- [x] 4.1 Update README normal-mode keymap and registers/undo section with `"{slot}` syntax, supported slots, append semantics, missing-register no-op behavior, and session-local storage.
- [x] 4.2 Update README limitations to remove named registers from unsupported features while keeping special registers, numbered registers, system clipboard, and persistence out of scope.
- [x] 4.3 Update `TODOS.md` to mark `registers` complete only after implementation and validation pass.

## 5. Validation

- [x] 5.1 Run `bun test` and fix failures.
- [x] 5.2 Run `bun run check-types` and fix TypeScript errors.
- [x] 5.3 Run `openspec validate add-named-registers --strict` or the project-equivalent OpenSpec validation command and fix artifact/spec issues.
