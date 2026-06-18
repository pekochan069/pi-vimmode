## Context

`src/buffer.ts` owns pure prompt-buffer navigation and edit operations. The current implementation keeps the public operation APIs stable, but internally duplicates two high-risk areas:

- small-word and WORD offset helpers for `w`, `W`, `e`, `E`, `b`, `B`, `ge`, and `gE`
- literal and regex substitution line-range traversal for range clamping, per-line iteration, match count aggregation, preview ranges, edit assembly, and cursor clamping

Prior regression notes show lowercase Vim word motions already drifted toward native/WORD behavior once, so this change must preserve Vim's two word models rather than collapse them. Ex substitution also has distinct literal and regex error/result semantics, so only traversal/result assembly should be shared.

## Goals / Non-Goals

**Goals:**

- Deduplicate word-motion helper logic in `src/buffer.ts` while preserving exact small-word and WORD cursor targets.
- Deduplicate substitution line-range traversal/result assembly while preserving literal and regex matcher semantics.
- Add or strengthen focused tests before refactoring so current cursor targets, ranges, counts, changed flags, and error shapes are locked.
- Keep public prompt-buffer operation APIs unchanged for modal, Ex, visual, and adapter callers.
- Keep side effects unchanged: registers, marks, dot-repeat, search highlights, visual state, Ex messages, cursor placement, and Pi delegation.

**Non-Goals:**

- No new Vim motions or changes to `w/W/e/E/b/B/ge/gE` behavior.
- No Ex parser changes, command syntax changes, regex backreference expansion, or replacement semantics changes.
- No modal engine, render, config, docs, settings, or `VimEditor` rewrite.
- No exported low-level helper API and no new runtime or dev dependencies.

## Decisions

1. Keep refactor scoped to `src/buffer.ts` and focused tests.
   - Seams: private word offset helpers, `motionTargetOffset`, `word*Position` callers, `substituteLineRangeLiteral`, `substituteLineRangeRegex`, and `test/buffer.test.ts`.
   - Rationale: TODO asks for buffer helper dedupe with TDD; callers already consume operation-level APIs.
   - Alternative considered: move word or substitution mechanics into modal/Ex layers. Rejected because prompt-buffer invariants belong in `src/buffer.ts`.

2. Model word unification as classifier-driven traversal, not one generic word concept.
   - Seams: small-word classifier remains `wordKind`/`isSameSmallWordKind`; WORD classifier remains non-whitespace span logic.
   - Rationale: Vim small-word and WORD semantics are intentionally different; unification should remove repeated loops while keeping separate boundary predicates.
   - Alternative considered: make small-word helpers call WORD helpers with options. Rejected because it invites the known lowercase small-word drift over punctuation-heavy text.

3. Preserve existing operation entry points and only replace their internals.
   - Seams: `wordForwardPosition`, `wordForwardBigPosition`, `wordEndPosition`, `wordEndBigPosition`, `wordBackwardPosition`, `wordBackwardBigPosition`, `wordPreviousEndPosition`, `wordPreviousEndBigPosition`, `deleteByMotion`, `yankByMotion`, and `motionTargetOffset`.
   - Rationale: tests and callers should keep asserting observable cursor/range behavior, not private helper names.
   - Alternative considered: export a new generic word navigation API. Rejected because this is a behavior-preserving cleanup with no user-facing capability.

4. Extract substitution range traversal/result assembly, leaving matcher-specific logic outside.
   - Shared seam: clamp line range, clone `nextLines`, iterate addressed lines, aggregate match count, map match ranges to `TextRange`, build `EditResult`, and clamp cursor after replacement.
   - Matcher-specific seams: literal `ignoreCase` matching, regex construction/limits, regex `lastIndex` handling, empty-match rejection, max-match failure, and `{ ok: true } | { ok: false }` result shape.
   - Rationale: duplication lives in traversal and assembly; matcher behavior carries distinct API and error contracts.
   - Alternative considered: one generic substitute function that accepts pattern and flags directly. Rejected because it risks erasing literal-vs-regex result differences and regex failure behavior.

5. Use TDD checkpoints to constrain each refactor independently.
   - Word checkpoint: add or confirm punctuation-heavy small-word/WORD contrast tests, counted motion tests, previous-end tests, and operator-motion range tests before changing loops.
   - Substitution checkpoint: add or confirm multi-line ranges, preview ranges, cursor clamp, no-match/identical replacement, invalid regex, empty-match, and max-match behavior before extraction.
   - Rationale: cursor and substitution regressions are easy to miss if all cleanup happens before tests.
   - Alternative considered: rely on existing full `bun test`. Rejected because focused red/green tests better prove this exact cleanup is safe.

## Risks / Trade-offs

- Small-word and WORD semantics collapse → Mitigation: test lowercase and uppercase motions side-by-side with punctuation-heavy fixtures such as `foo/bar baz qux`, `--flag value`, and `/tmp/a-b next`.
- Previous-end off-by-one drift near EOF or whitespace → Mitigation: lock `ge`/`gE` counted and boundary cases before refactor.
- Operator-motion ranges diverge from normal navigation → Mitigation: include `d`, `c`, and `y` motion coverage for small-word and WORD paths.
- Regex global state changes across lines → Mitigation: keep regex `lastIndex` reset/assignment inside matcher-specific logic and test multi-line regex substitution.
- Regex error shape changes → Mitigation: keep `substituteLineRangeRegex` returning `{ ok: false, message }` without edit data for invalid pattern, empty match, too-long pattern/subject, and match-count overflow.
- Shared helper becomes too generic to read → Mitigation: keep helper local, typed, and limited to current line substitution result shape.

## Migration Plan

1. Add or confirm focused buffer tests for word/WORD navigation, previous-end, counted motions, operator-motion ranges, and substitution line-range semantics.
2. Refactor word helpers behind existing exported operation APIs.
3. Run `bun test test/buffer.test.ts` and fix only behavior-preserving drift.
4. Refactor substitution line-range traversal/result assembly behind existing literal/regex APIs.
5. Run `bun test test/buffer.test.ts` again.
6. Run full validation: `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.
7. Rollback strategy: revert the helper extraction while keeping added regression tests if any observable behavior changes unexpectedly.

## Open Questions

- None. If implementation finds missing coverage for an existing edge case, add the test first and preserve current behavior.
