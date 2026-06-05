## Context

`pi-vimmode` already has finite prompt-local editing semantics, but range handling is scattered:

- `src/ex.ts` parses current Ex line addresses and destinations (`.`, `$`, numeric, `%`, `'<,'>`, comma ranges, destination `0`).
- `src/buffer.ts` owns pure prompt-buffer range math and edit operations.
- `src/modal/engine.ts` bridges modal state, visual captures, marks, search, operators, Ex execution, registers, dot-repeat, messages, and highlight clearing.
- `src/commands.ts` parses key sequences into semantic operator/motion/search/text-object intents.

The change must deepen range handling without broad Vim parity, without growing the modal state machine, and without changing Pi adapter or insert-mode behavior.

## Goals / Non-Goals

**Goals:**

- Introduce a pure prompt-local range algebra module for finite range parsing and resolution.
- Support Ex offsets and semicolon ranges for existing supported Ex line commands and destinations.
- Preserve existing Ex range, visual range, destination `0`, operator motion, search, mark, visual, register, cursor, and highlight behavior while limiting v1 unification to Ex ranges plus typed adapters.
- Give tests one focused seam for range parser/resolver edge cases.
- Keep `VimEditor` thin and keep modal code focused on state/effects, not range arithmetic.

**Non-Goals:**

- No full Vimscript, `:global`, expression ranges, recursive mappings, `+cmd` suffixes, or Vim/Neovim parity claims.
- No new runtime dependencies, settings, config propagation, or peer dependency changes.
- No prompt-wide Markdown/XML AST parser or language-aware structure resolver.
- No user-visible changes to existing operator, mark, search, visual, or Pi shortcut behavior beyond new Ex offset/semicolon syntax.
- No full production reroute of operator motion, mark, search, or text-object resolution through the new kernel in v1.

## Decisions

### Decision: Add a pure `src/range.ts` seam instead of expanding `src/ex.ts` or `src/buffer.ts`

Target seams: `src/range.ts`, `src/ex.ts`, `src/buffer.ts`, `src/modal/engine.ts`.

Create a pure module that exports typed parsers/resolvers for finite Ex prompt-local ranges plus typed wrappers for already-resolved line, character, block, and destination targets. `src/ex.ts` remains the finite command parser and delegates address/range parsing/resolution. `src/buffer.ts` remains the edit operation module and can consume typed resolved ranges through adapters. `src/modal/engine.ts` supplies Ex state as data and applies effects.

Alternatives considered:

- Keep adding address logic to `src/ex.ts`: rejected because offsets/semicolon/destinations would make command parsing own range algebra.
- Move all range logic into `src/buffer.ts`: rejected because buffer is already the operation layer and would become a god module mixing parsing, resolving, and editing.
- Resolve ranges in `src/modal/engine.ts`: rejected because modal engine already coordinates many side effects and should not own arithmetic.

### Decision: Model range parsing as finite AST plus resolver context

Target seams: `src/range.ts`, `src/ex.ts`, tests.

Represent Ex address grammar as a small AST, then resolve with prompt context:

- address atoms: current line, last line, numeric line, visual line range, percent/all-lines, destination zero.
- offsets: one signed line delta on supported atoms in v1, such as `.+1`, `$-2`, `3+2`, `3-1`; repeated deltas like `.+1-2` are rejected until a later change explicitly specs them.
- separators: comma and semicolon.
- destinations: single address resolved for copy/move/put placement, preserving `0` as before-first sentinel where valid.

Resolver context includes line count, current cursor line, captured visual Ex range when present, and semicolon base while resolving second addresses.

Alternatives considered:

- Parse directly into resolved lines: rejected because semicolon base semantics and invalid-target reporting become hard to test independently.
- Reuse raw strings across parser and modal layers: rejected because callers would continue duplicating validation and bounds handling.

### Decision: Define semicolon as explicit base reset, not broader Vim expression support

Target seams: `src/range.ts`, `src/ex.ts`, docs.

For `addr1;addr2`, resolve `addr1`, then resolve `addr2` with current-line base set to `addr1`. This affects relative second addresses such as `;.+2`. It does not imply support for search-address commands, `+cmd`, expression evaluation, or repeated separators beyond the finite grammar documented in specs.

Alternatives considered:

- Treat `;` as alias for `,`: rejected because it would contradict useful Vim-like base semantics.
- Implement full Vim address grammar now: rejected because prompt editing needs finite safe behavior, not parity.

### Decision: Preserve existing side-effect boundaries; resolver returns values only

Target seams: `src/modal/engine.ts`, `src/buffer.ts`, `src/vim-editor.ts`.

Range resolution MUST NOT mutate prompt text, registers, marks, dot-repeat state, search state, visual state, Ex history, preview state, messages, or cursor. Modal/buffer operations remain responsible for side effects after successful resolution:

- registers: Ex delete/yank keep existing unnamed linewise behavior; named registers remain unchanged.
- marks: resolver reads mark data supplied by modal, but does not write marks.
- dot-repeat: Ex commands still do not update dot repeat.
- search highlights: text-changing Ex commands clear visible highlights; yank/read-only commands preserve them; `:nohlsearch` clears them.
- visual state: visual Ex cancellation restores captured mode/anchor/cursor; `'<,'>` still means touched lines, not selected chars/block cells.
- cursor placement: existing buffer operation results remain source of truth.
- Pi delegation: insert-mode default behavior and Pi shortcuts remain outside range kernel.

Alternatives considered:

- Let resolver return edit effects: rejected because it would couple pure resolution to modal side effects.
- Let Ex parser apply messages/history: rejected because parser should remain pure and testable.

### Decision: Migrate incrementally behind compatibility tests

Target seams: tests and implementation order.

Start by covering existing behavior, then extract reusable parsing/resolution, then add offsets and semicolons. Existing tests for `:t0`, visual ranges, invalid ranges, substitution preview, delete/yank/put/copy/move/join, operator search/mark/motion, and visual operations must remain green.

Alternatives considered:

- Big-bang refactor all range users first: rejected because it risks breaking modal state and Ex preview behavior.
- Add offsets first and refactor later: rejected because it would entrench another one-off parser branch.

## Risks / Trade-offs

- Ex grammar sprawl → Mitigation: keep grammar finite, document non-goals, and reject unsupported syntax with readable Ex errors.
- Semicolon semantics surprise users → Mitigation: specify base reset scenarios and document examples in `docs/features.md`.
- Destination `0` regression → Mitigation: preserve `:2t0` and `:3,4m0` tests before changing destination parsing.
- Visual range semantics regression → Mitigation: keep visual Ex range captured at entry and line-based; test visual char/line/block entry and cancel.
- Modal side effects leak into resolver → Mitigation: resolver accepts state snapshots as plain data and returns typed results/errors only.
- `src/buffer.ts` grows too broad → Mitigation: keep range parser/resolver in new pure module; buffer keeps edit operations.
- Existing operator behavior changes accidentally → Mitigation: do not reroute operator/search/mark/text-object production paths in v1; add only typed adapters and preserve regression tests.

## Migration Plan

1. Add focused range parser/resolver tests for current Ex behavior, destination `0`, invalid ranges, offsets, and semicolon base semantics.
2. Add `src/range.ts` with AST, typed result/error shapes, and pure resolver context.
3. Refactor `src/ex.ts` to delegate Ex range and destination parsing/resolution while preserving current parse result shapes where callers depend on them.
4. Wire Ex commands through typed resolved line ranges and destinations; keep modal side-effect behavior unchanged.
5. Add offset and semicolon integration tests for substitution, delete/yank/put, copy/move destinations, and join where applicable.
6. Add typed wrappers/adapters for existing line, character, block, and destination targets; defer broad production rerouting of operator motion, mark, search, and text-object resolution until a follow-up change can do it with focused tests.
7. Update user docs for Ex offset and semicolon syntax; no settings docs changes expected.
8. Validate with `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback strategy: revert `src/range.ts` integration and restore existing `src/ex.ts` parser behavior. Because no data model, settings, or dependency migration exists, rollback is code-only.

## Open Questions

- Should semicolon support be limited to one separator per range in v1, matching existing comma-only shape?
- Which existing low-level range helpers stay exported for tests versus become private after the new resolver seam lands?
- Which follow-up change should consolidate operator/search/mark/text-object production paths through the typed range adapters?
