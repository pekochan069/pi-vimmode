## 1. Parser

- [x] 1.1 Add a typed `lineJump` parse result to `src/ex.ts` for commandless single-address inputs.
- [x] 1.2 Keep empty input as `empty` and reject commandless `%`, comma/semicolon ranges, and visual ranges with readable Ex errors.
- [x] 1.3 Add `test/ex.test.ts` coverage for `:3`, `:.`, `:$`, `:2+1`, invalid `:0`/`:999`/`:$+1`, and rejected `:%`/`:2,4`/`:2;.+1`/`:'<,'>`.

## 2. Modal Execution

- [x] 2.1 Handle `lineJump` in `src/modal/ex-command-line.ts` with `restoreCursor` plus `invalidate`, preserving prompt text and clamping column to target line length.
- [x] 2.2 Finish line jumps as successful Ex commands so pending Ex clears and history records the command without edit effects.
- [x] 2.3 Add modal tests for cursor move, column clamp, preserved registers/marks/search/macros/dot-repeat, invalid jump no-op, and visual-source jump returning to normal mode.

## 3. Documentation

- [x] 3.1 Update `docs/features.md` supported Ex commands with `:n`/`:$` line-jump examples.
- [x] 3.2 Document unsupported commandless ranges and side effects: no prompt edit, no register/search/mark/macro/dot-repeat mutation.

## 4. Validation

- [x] 4.1 Run `bun test`.
- [x] 4.2 Run `bun run check-types`.
- [x] 4.3 Run `bun run lint`.
- [x] 4.4 Run `bun run format:check`.
- [x] 4.5 Run `openspec validate --specs --strict`.
