## Context

`src/ex.ts` already parses finite Ex line addresses and returns a resolved `LineRange` plus the remaining command text. Today a bare address like `:3` parses the address, finds no command name, and returns an unsupported-command error. `src/modal/ex-command-line.ts` owns Ex execution and already has a `restoreCursor` modal effect for cursor-only moves.

## Goals / Non-Goals

**Goals:**

- Support bare single-address Ex line jumps: `:n`, `:.`, `:$`, and existing single-address offset forms.
- Keep prompt text unchanged and preserve registers, marks, search state, macros, and dot-repeat.
- Preserve finite Ex grammar; no broad Vimscript/default Ex command behavior.
- Cover parser, modal effect, docs, and strict OpenSpec validation.

**Non-Goals:**

- No commandless range behavior for `:%`, `:2,4`, or visual range markers.
- No `:goto`, `:print`, file/window navigation, settings, or new keybindings.
- No adapter or Pi runtime API changes.

## Decisions

1. Add a typed `lineJump` Ex parse result in `src/ex.ts`.
   - Target seams: `src/ex.ts`, `test/ex.test.ts`.
   - Behavior: after `parseExLineRange`, if command rest is empty and the parsed address AST is a single address, return `lineJump` with the resolved line. Empty input remains `empty`; percent/range/visual commandless forms return an Ex error.
   - Alternative: treat every commandless range as a jump to range end. Rejected: adds Vim-ish ambiguity and turns `3:` prefilled ranges into surprising navigation.
   - Alternative: add a named `:goto` command. Rejected: TODO asks for `:n`; named command increases surface for no benefit.

2. Execute line jumps as cursor-only modal effects in `src/modal/ex-command-line.ts`.
   - Target seams: `executeExCommand`, existing `restoreCursor` effect.
   - Behavior: finish Ex successfully, record command history, clear pending Ex state, move cursor to the resolved line, preserve current column clamped to target line length, and do not issue an edit effect.
   - Side effects: prompt text unchanged; registers, marks, search highlights, last search, macros, message history, and dot-repeat unchanged. Visual-source line jump exits to normal mode because it is an active cursor move, not read-only popup restoration.
   - Alternative: add a buffer edit helper. Rejected: no text changes; direct target calculation is smaller and safer.

3. Keep docs/tests narrow.
   - Target seams: `test/ex.test.ts`, `test/modal.test.ts`, `docs/features.md`.
   - Parser tests cover accepted single addresses and rejected commandless ranges.
   - Modal tests cover cursor move, column clamp, history/no side effects, and invalid commandless range safety.
   - Docs add `:n` examples and note unsupported commandless ranges.

## Risks / Trade-offs

- Commandless ranges accidentally become supported → parser tests assert `:%` and `:2,4` reject.
- Cursor column can exceed target line length → execution clamps against target line.
- Visual Ex semantics could surprise users → spec states bare jump exits visual mode to normal because it moves cursor.
- History without a visible success count can feel quiet → preserve existing successful Ex history semantics; no new message required.

## Migration Plan

- Implement parser and modal executor changes.
- Update docs/features.md.
- Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.
- Rollback: remove the `lineJump` parse/execution branch and docs/tests.

## Open Questions

None.
