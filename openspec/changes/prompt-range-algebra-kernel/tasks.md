## 1. Range Kernel Tests

- [x] 1.1 Add `test/range.test.ts` covering existing Ex address behavior: omitted current line, `%`, `.`, `$`, numeric lines, comma ranges, visual `'<,'>` capture, invalid/reversed ranges, and destination `0`.
- [x] 1.2 Add range parser/resolver tests for signed offsets: `.+1`, `$-2`, `3+2`, `3-1`, offset bounds errors, rejected repeated offsets like `.+1-2`, and unsupported `0+1` destination syntax.
- [x] 1.3 Add semicolon tests for base reset behavior, reversed semicolon ranges, missing second address, repeated separators, and unsupported broad Vim syntax.
- [x] 1.4 Add typed output tests for line ranges, character ranges, block ranges, destinations, and side-effect-free error results.

## 2. Pure Range Kernel

- [x] 2.1 Create `src/range.ts` with finite Ex address/range/destination AST types, typed resolved range results, resolver context, and typed error results.
- [x] 2.2 Implement pure Ex address parsing for current line, last line, numeric line, `%`, visual `'<,'>`, destination `0`, signed offsets, comma ranges, and semicolon ranges.
- [x] 2.3 Implement pure resolution for Ex line ranges and destinations using prompt line count, cursor line, captured visual range, and semicolon base context.
- [x] 2.4 Add typed helpers or adapters for modal-compatible resolved targets: line ranges, character ranges, block ranges, and destinations.
- [x] 2.5 Keep resolver side-effect free: no prompt text/register/mark/search/highlight/visual/history/message/cursor/Pi adapter mutation inside `src/range.ts`.

## 3. Ex Parser and Command Integration

- [x] 3.1 Refactor `src/ex.ts` to delegate range and destination parsing/resolution to `src/range.ts` while preserving current parse result shapes where callers require them.
- [x] 3.2 Wire Ex substitution preview/apply to resolved line ranges and add tests for offset and semicolon preview/apply behavior.
- [x] 3.3 Wire Ex delete, yank, put, join, prompt transforms, copy, and move to resolved line ranges and destinations.
- [x] 3.4 Preserve compatibility tests for `%`, `.`, `$`, numeric ranges, visual `'<,'>`, count-prefilled ranges, invalid ranges, `:2t0`, and `:3,4m0`.
- [x] 3.5 Ensure Ex error handling leaves prompt text, registers, Ex history, preview state, and cursor behavior unchanged on invalid ranges or destinations.

## 4. Prompt Buffer and Modal Integration

- [x] 4.1 Update `src/buffer.ts` operation-level APIs or adapters to consume typed resolved line, character, block, and destination ranges without exposing new low-level clamp helpers.
- [x] 4.2 Add prompt-buffer tests for line range operations, character range operations, visual-block range operations, destination operations, invalid range safety, and cursor placement.
- [x] 4.3 Keep `src/modal/engine.ts` as state/effect coordinator by passing Ex snapshots into range helpers and applying buffer results without adding broad range arithmetic branches.
- [x] 4.4 Add modal regression tests for dot-repeat preservation, register writes, search highlight clearing/preservation, visual Ex range capture/cancel, existing mark/search/operator behavior, and protected Pi shortcut delegation.
- [x] 4.5 Confirm no settings/config option was added; if one becomes necessary, update `src/config.ts`, `src/types.ts`, `VimEditor` `cloneOptions`, docs, and live editor tests in same change.

## 5. Documentation and Source of Truth

- [x] 5.1 Update `docs/features.md` with supported Ex offsets, semicolon base semantics, destination offsets, destination `0`, examples, and unsupported range syntax limits.
- [x] 5.2 Update any affected README/docs index links only if docs structure changes; keep README as quickstart/index rather than full behavior reference.
- [x] 5.3 Ensure OpenSpec specs remain aligned with implemented behavior and do not claim full Vim/Neovim parity.

## 6. Validation

- [x] 6.1 Run `bun test` and fix failures.
- [x] 6.2 Run `bun run check-types` and fix failures.
- [x] 6.3 Run `bun run lint` and fix failures.
- [x] 6.4 Run `bun run format:check` and fix failures.
- [x] 6.5 Run `openspec validate --specs --strict` and fix failures.
- [x] 6.6 Run `openspec status --change "prompt-range-algebra-kernel"` and confirm change is apply-ready.
