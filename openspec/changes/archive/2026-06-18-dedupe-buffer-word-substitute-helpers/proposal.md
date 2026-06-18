## Why

`src/buffer.ts` has duplicated small-word/WORD navigation helpers and duplicated literal/regex substitution line-range traversal. This raises regression risk for cursor placement, operator ranges, substitution ranges, and future maintenance, so the cleanup should be isolated and test-driven.

## What Changes

- Unify small-word and WORD offset helpers around a shared boundary classifier while preserving current `w`, `W`, `e`, `E`, `b`, `B`, `ge`, and `gE` behavior.
- Extract shared substitution line-range traversal for literal and regex substitution while preserving replacement text, match counts, highlight ranges, cursor clamping, and error handling.
- Add focused regression tests before refactoring to lock current word-motion and substitution edge cases.
- Keep all public prompt-buffer operation APIs and modal/editor callers unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `prompt-buffer-operations`: Add a behavior-preserving refactor contract for shared word-boundary and substitution line-range helpers, backed by focused tests.

## Impact

- Affected code: `src/buffer.ts`, especially word offset helpers and `substituteLineRangeLiteral`/`substituteLineRangeRegex` traversal.
- Affected tests: `test/buffer.test.ts` word-motion, operator-motion, and substitution coverage.
- Docs/API: no user-facing behavior, public API, settings, command syntax, or documentation changes expected.
- Dependencies: no new runtime or dev dependencies.
- Compatibility: no breaking changes.
- Non-goals: no new Vim motions, no changed word/WORD semantics, no Ex parser changes, no regex replacement semantics, no modal engine or `VimEditor` rewrite.
