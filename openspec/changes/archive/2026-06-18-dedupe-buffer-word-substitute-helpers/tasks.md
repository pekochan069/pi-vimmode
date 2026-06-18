## 1. Word and WORD Regression Tests

- [x] 1.1 Add or confirm `test/buffer.test.ts` coverage for lowercase `w`, `e`, `b`, and `ge` over punctuation-heavy fixtures such as `foo/bar baz qux`, `--flag value`, and `/tmp/a-b next`.
- [x] 1.2 Add or confirm matching uppercase `W`, `E`, `B`, and `gE` coverage on the same fixtures to prove whitespace-delimited WORD behavior stays distinct from small-word behavior.
- [x] 1.3 Add or confirm counted motion and prompt-boundary tests for `w/W/e/E/b/B/ge/gE`, especially previous-end behavior near EOF, whitespace, and prompt start.
- [x] 1.4 Add or confirm delete, change, and yank operator-motion tests that use small-word and WORD motions and assert register text, cursor placement, changed flags, and safe no-op behavior.

## 2. Word Helper Refactor

- [x] 2.1 Introduce narrow private classifier/predicate helpers in `src/buffer.ts` that keep small-word `wordKind` semantics separate from WORD non-whitespace semantics.
- [x] 2.2 Refactor `nextWordStartOffset`, `nextWORDStartOffset`, `wordEndOffset`, `wordEndWORDOffset`, `previousWordEndOffset`, `previousWordEndWORDOffset`, `previousWordStartOffset`, and `previousWORDStartOffset` to share traversal logic without changing exported operation APIs.
- [x] 2.3 Confirm `motionTargetOffset`, `word*Position`, `deleteByMotion`, `change` paths, and `yankByMotion` continue to use the same observable targets and ranges.
- [x] 2.4 Run `bun test test/buffer.test.ts` and fix only behavior-preserving drift before starting substitution refactor.

## 3. Substitution Regression Tests

- [x] 3.1 Add or confirm literal substitution tests for bounded multi-line ranges, global and non-global matching, match counts, preview ranges, cursor clamping after line length changes, and `changed` flags.
- [x] 3.2 Add or confirm regex substitution tests for valid multi-line matches, literal replacement text, preview ranges, cursor clamping, and `{ ok: true }` result shape.
- [x] 3.3 Add or confirm regex error tests for invalid pattern, empty pattern, empty-match pattern, too-long pattern or subject, and match-count overflow returning `{ ok: false, message }` without edit data.
- [x] 3.4 Add or confirm no-match and identical-replacement tests preserve original text, existing match-count semantics, safe cursor clamp, and `changed: false`.

## 4. Substitution Helper Refactor

- [x] 4.1 Extract a private shared line-range traversal/result assembly helper for clamping lines, cloning `nextLines`, aggregating matches, mapping `TextRange` values, building `EditResult`, and cursor clamping.
- [x] 4.2 Wire `substituteLineRangeLiteral` through the shared traversal while keeping literal matching, `ignoreCase`, global handling, and result shape unchanged.
- [x] 4.3 Wire `substituteLineRangeRegex` through the shared traversal while keeping regex construction limits, `lastIndex` handling, empty-match rejection, max-match failures, and `ok`/error result shape unchanged.
- [x] 4.4 Run `bun test test/buffer.test.ts` and verify word-motion tests still pass after substitution extraction.

## 5. Scope Check and Validation

- [x] 5.1 Confirm no modal engine, Ex parser, config, render, docs, settings, public API, or dependency changes were introduced unless a failing test proves they are necessary.
- [x] 5.2 Run `bun test`.
- [x] 5.3 Run `bun run check-types`.
- [x] 5.4 Run `bun run lint`.
- [x] 5.5 Run `bun run format:check`.
- [x] 5.6 Run `openspec validate --specs --strict`.
- [x] 5.7 Run `graphify update .` after code changes so the project graph stays current.
