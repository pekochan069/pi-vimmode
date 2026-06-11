## Context

`pi-vimmode` already has three nearby pieces:

- `src/commands.ts` parses finite semantic operators, motions, text objects, prompt search, and char-argument commands.
- `src/buffer.ts` owns pure prompt-buffer edits and already exposes `findCharOnLine()` for normal-mode `f`/`F`/`t`/`T` movement.
- `src/modal/normal.ts` applies normal commands, operator motions, operator text objects, and repeatable changes through modal effects.

Initial gap: `f`/`F`/`t`/`T` worked as line-local movement commands, but the parser did not treat those char-argument commands as valid targets after `d`, `c`, or `y`. During implementation, the same operator-pending audit found the normal motion allow-list still omitted supported range-safe motions (`h`, `j`, `k`, `l`, `gg`, `G`, `%`) and repeat character-search targets (`;`, `,`). Implementation should extend the finite grammar without introducing full Vim grammar or leaking offset math into modal routing.

## Goals / Non-Goals

**Goals:**

- Support `df{char}`, `dF{char}`, `dt{char}`, `dT{char}` and the same targets for `c` and `y`.
- Support `d;`, `d,`, `c;`, `c,`, `y;`, and `y,` against the last successful character search.
- Support the same range-safe normal motions after `d`, `c`, and `y`: `h`, `j`, `k`, `l`, `w`, `b`, `e`, `0`, `^`, `$`, `gg`, `G`, `%`.
- Support resolved semantic keymap bindings for char-search commands after operators, including multi-key bindings.
- Support finite counts after operators for motion and char-search targets where parser state can resolve them deterministically.
- Preserve register, cursor, mode, last-character-search, search-highlight, and dot-repeat semantics explicitly.
- Keep char-search ranges current-line only and safe on missing targets.

**Non-Goals:**

- Full Vim operator grammar, recursive mappings, timeouts, or `.vimrc`/Lua compatibility.
- Cross-line character search.
- Prompt search (`/`, `?`) behavior changes.
- New settings or runtime dependencies.

## Decisions

### 1. Extend the finite parser with an explicit operator-char-search result

Target seams: `src/commands.ts`, `src/types.ts`, `test/commands.test.ts`.

Add a semantic parser result such as:

```ts
{
  type: ("operatorCharSearch", operator, command, char, count);
}
```

and an encoded pending state for operator + char-search command prefix + optional occurrence count. `resolveAfterOperator()` should recognize only configured command bindings whose semantic command is one of `findCharForward`, `findCharBackward`, `tillCharForward`, or `tillCharBackward`.

Alternatives considered:

- Treat `f`/`t` as ordinary motions in `operatorMotions`: rejected because they require a following printable char and line-local inclusive/exclusive range semantics, unlike current one-key motion actions.
- Special-case raw `d` + `f` in `modal/engine.ts`: rejected because it bypasses semantic keymap configuration and repeats the pre-configurable parser coupling this codebase already moved away from.

### 2. Keep character-search range math inside `src/buffer.ts`

Target seams: `src/buffer.ts`, `test/buffer.test.ts`.

Add operation-level helpers for char-search operator targets, for example:

- `deleteByCharSearch(text, cursor, kind, target, count)`
- `yankByCharSearch(text, cursor, kind, target, count)`
- shared internal range resolver that finds the raw matched character offset on the current line

Range rules:

- `f`: current cursor through matched character, inclusive.
- `t`: current cursor up to matched character, excluding matched character; no-op when range is empty.
- `F`: matched character through current cursor, inclusive.
- `T`: after matched character through current cursor; no-op when range is empty.

Alternatives considered:

- Reuse `findCharOnLine()` plus `deleteRange()`: rejected because `findCharOnLine()` returns movement destinations, not operator ranges; `t`/`T` can resolve to the current cursor and must not accidentally delete one character.
- Compute offsets in modal code: rejected because prompt-buffer invariants and register text should stay in pure buffer operations.

### 3. Apply operator char search in `src/modal/normal.ts` and preserve side effects

Target seams: `src/modal/normal.ts`, `src/modal/types.ts`, modal/editor tests.

Add an `applyOperatorCharSearch()` helper parallel to `applyOperatorMotion()` and `applyOperatorTextObject()`:

- `delete`: delete resolved range, write unnamed character register, remain normal.
- `change`: delete resolved range, write unnamed character register, enter insert on change.
- `yank`: copy resolved range, leave text/mode unchanged.
- Successful operations update `lastCharSearch` so `;` and `,` repeat the same line-local search command from the new cursor.
- Successful delete/change operations become dot-repeatable by storing a new repeatable-change variant with operator, command, target, and count.
- Missing target or empty range clears pending state, leaves registers/mode/text/cursor unchanged, and should not update `lastCharSearch` or dot-repeat.
- Any successful text edit clears stale search highlights through existing `editState()` behavior.

Alternatives considered:

- Route through `applyCommand()` first, then derive a range from moved cursor: rejected because movement side effects would happen before operator semantics and would make missing-target rollback harder.
- Leave dot-repeat unsupported initially: rejected because existing operator changes are repeatable and omission would create inconsistent behavior for `dfx` versus `dw`.

### 4. Treat counts as finite occurrence counts without adding recursive Vim grammar

Target seams: `src/commands.ts`, `src/modal/normal.ts`, tests.

Use existing count-before-operator plumbing for sequences such as `2df,`, and add after-operator count handling for sequences such as `d2f,`, `d2w`, and `d2;`. Effective occurrence count should be deterministic; if both positions are used, multiply counts like Vim (`2d3f,` targets the sixth occurrence) for supported finite targets.

Alternatives considered:

- Ignore `d2f,`: rejected because counts already work for normal char search and users reasonably expect the same target count under operators.
- Add full recursive Vim count grammar: rejected as broader grammar work. The implemented path only reuses the existing pending-state count for supported finite operator targets.

### 5. Docs and validation stay source-of-truth aligned

Target seams: `docs/features.md`, `docs/settings.md`, OpenSpec delta specs, docs drift tests.

Update user docs to describe supported operator char-search combinations and limitations. Settings docs should state that configured char-search command bindings also work after supported motion-capable operators. Do not imply arbitrary operator support for shift operators or unsupported commands.

Alternatives considered:

- Only update tests: rejected because keybinding behavior is user-facing and settings docs already enumerate operator target limitations.

## Risks / Trade-offs

- Parser pending-state ambiguity with multi-key command bindings → Mitigation: encode operator-char-search pending state with sentinels, add tests for configured multi-key `findCharForward`/`tillCharForward` bindings.
- Off-by-one range bugs for `t`/`T` → Mitigation: test immediate-target no-op, forward/backward inclusion/exclusion, register contents, and cursor placement in `test/buffer.test.ts`.
- Dot-repeat or `;` repeat updates after no-op → Mitigation: only update repeat state when buffer helper returns changed text for delete/change or a non-empty register for yank.
- Scope drift into full Vim operator grammar → Mitigation: docs/specs name exact supported motion/command families and preserve safe invalid handling for unsupported operator targets.
- Config propagation risk → Mitigation: no new option family; still add tests proving live resolved keymaps route configured char-search commands after operators.
- User workspace already has many uncommitted files → Mitigation: implementation should touch only files required by this change and avoid formatting unrelated files.

## Migration Plan

1. Add parser result/pending state and parser tests.
2. Add buffer char-search operator range helpers and focused range/register tests.
3. Wire modal application, repeat state, and editor/modal behavior tests.
4. Update docs and OpenSpec validation.
5. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback: revert the parser result, buffer helpers, modal application, tests, and docs added for this change. No data migration or dependency rollback required.

## Open Questions

- Should `y{char-search}` update `lastCharSearch` even though it does not move the cursor? Proposed answer: yes when a non-empty target range exists, because it is still a successful character search command.
- Should after-operator counts become generic for text objects later? Proposed answer: defer; this change covers supported motions and character-search targets only.
