## Why

Prompt range behavior is split across Ex parsing, buffer math, modal operator handling, marks, search, and visual capture code. A reusable range algebra kernel reduces one-off parser branches and unlocks finite Ex range offsets, semicolon ranges, safer substitution targets, and future prompt-local operator coverage without growing `src/modal/engine.ts`.

## What Changes

- Add a prompt-local range algebra kernel that parses and resolves finite Ex line ranges and destinations into typed results, with typed modal-compatible range adapters for future consolidation.
- Add Ex range offsets for supported addresses and destinations, including examples like `.+1`, `$-2`, `3+2`, and `3-1`.
- Add Ex semicolon range support with explicit prompt-local base semantics for relative second addresses.
- Route existing Ex range handling through the shared resolver while preserving current `%`, `.`, `$`, numeric, `'<,'>`, comma, and `0` destination behavior.
- Add typed range wrappers and buffer adapters for line, character, block, and destination targets without forcing all existing modal operator/search/mark/text-object paths through the new kernel in v1.
- Add focused unit coverage for range parsing/resolution plus integration coverage for Ex command behavior and modal state preservation.

### Non-goals

- No full Vimscript parser, recursive mappings, `:global`, expression ranges, `+cmd` suffixes, language-aware parsing, or broad Vim/Neovim parity.
- No new prompt document AST; Markdown/list/tag/error-block structures remain finite prompt-native helpers.
- No changes to Pi application shortcuts, insert-mode default behavior, or runtime peer dependencies.

## Capabilities

### New Capabilities

- `prompt-range-algebra`: Defines the reusable prompt-local Ex range resolver, typed range outputs, offset/base semantics, and safe invalid-target behavior, plus typed adapters for modal-compatible range targets.

### Modified Capabilities

- `vim-ex-command-line`: Adds Ex address offsets and semicolon range support for supported line commands and destinations while preserving existing range behavior.
- `prompt-buffer-operations`: Deepens prompt buffer operations around typed range inputs so callers stop manually composing low-level line/offset/clamp helpers.

## Impact

- Affected code seams: `src/ex.ts`, new `src/range.ts` or equivalent pure range module, `src/buffer.ts`, `src/modal/engine.ts`, and `src/commands.ts` integration boundaries.
- Tests: add focused resolver tests, extend Ex parser/command tests, preserve buffer/modal/visual/search/mark/operator regression coverage.
- Docs/specs: update OpenSpec capability specs; update user-facing docs only for visible Ex offset and semicolon range syntax.
- Dependencies: no new runtime dependencies and no peer dependency changes.
- Compatibility: no breaking changes intended; invalid new range syntax must fail safely without mutating prompt text, registers, marks, or search state.
