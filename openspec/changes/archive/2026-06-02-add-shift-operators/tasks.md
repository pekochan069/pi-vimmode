## 1. Parser, Types, and Keymap Configuration

- [x] 1.1 Add failing parser/config tests for default `>` / `<` shift operators, `>>` / `<<` line-command resolution, and counted `3>>` / `2<<` parsing.
- [x] 1.2 Extend `VimOperatorAction`, default keymap, keymap cloning, and semantic parser support for `indent` / `dedent` line-only operators until tests pass.
- [x] 1.3 Add failing tests proving unsupported shift targets such as `>w`, `>iw`, `>/query`, and `>'a` invalidate safely without producing delete/change/yank actions.
- [x] 1.4 Add parser/config guards, including a motion-capable operator type or equivalent guard, so shift operators only resolve repeated-operator line commands and never resolve operator-motion, search, text-object, or mark operations.
- [x] 1.5 Add failing tests for configured `piVimMode.keymap.operators.indent` / `dedent` bindings and rejected `operatorMotions.indent` / `operatorMotions.dedent` settings.
- [x] 1.6 Implement keymap validation and warnings for shift operator settings while preserving valid sibling fields.

## 2. Normal Mode Shift Behavior

- [x] 2.1 Add failing buffer/modal tests for normal `>>`, `<<`, counted shifts, clamped ranges, cursor preservation, and no register writes.
- [x] 2.2 Implement pure line-shift helper(s) that delegate to existing `applyPromptTransform()` indent/dedent semantics.
- [x] 2.3 Wire `indent` / `dedent` line commands through `src/modal/engine.ts` using the pure helper(s), `editState()`, and normal-mode effects.
- [x] 2.4 Add failing dot-repeat regression tests for successful normal `>>` / `<<` commands.
- [x] 2.5 Implement repeat-state support for normal line shifts without changing existing `dd`, `cc`, `yy`, operator-motion, or command repeat behavior.

## 3. Visual Shift Behavior

- [x] 3.1 Add failing modal tests for visual character `>`, visual line `<`, and visual block `>` / `<` shifting all touched lines.
- [x] 3.2 Implement visual shift handling for `indent` / `dedent`, returning to normal mode and clearing selection.
- [x] 3.3 Add failing visual regression tests for register preservation, search-highlight clearing on changed text, and no effect without a visual anchor.
- [x] 3.4 Implement visual shift side effects through existing modal edit paths without adding Ex messages or Pi delegation changes.

## 4. Live Editor and Regression Coverage

- [x] 4.1 Add live editor or integration tests proving configured shift operators survive `VimEditor` option cloning and execute through the adapter path.
- [x] 4.2 Add regression tests proving existing delete/change/yank operator-motion, visual delete/change/yank, Ex `:indent` / `:dedent`, and protected insert-mode `<` / `>` input behavior remain unchanged.
- [x] 4.3 Fix any regressions revealed by the coverage while keeping parser, buffer, and modal helpers small and focused.

## 5. Documentation

- [x] 5.1 Update `docs/features.md` with `>>`, `<<`, counts, visual `>` / `<`, transform semantics, dot-repeat behavior, and unsupported `>{motion}` / `<{motion}` limitations.
- [x] 5.2 Update `docs/settings.md` with `piVimMode.keymap.operators.indent`, `piVimMode.keymap.operators.dedent`, defaults, configuration examples, and line-only `operatorMotions` limitations.

## 6. Validation

- [x] 6.1 Run `bun test` and fix failures.
- [x] 6.2 Run `bun run check-types` and fix failures.
- [x] 6.3 Run `bun run lint` and fix failures.
- [x] 6.4 Run `bun run format:check` and fix failures.
- [x] 6.5 Run `openspec validate add-shift-operators --type change --strict` and `openspec validate --specs --strict`; fix validation issues.
