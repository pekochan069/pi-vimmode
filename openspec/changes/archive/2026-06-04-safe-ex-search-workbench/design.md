## Context

`/` prompt search and `:` Ex command-line currently use separate pending states and separate input handlers in `src/modal/engine.ts`. Search stores a query string and direction, while Ex stores command text plus visual-source metadata. Both collectors only append printable input and backspace from the end, and Ex substitutions parse literal patterns then mutate immediately on `Enter`.

This change adds shared entry behavior, history, backward search, regex opt-in, and substitution preview. It crosses parser, buffer, modal state, render, config/keymap, docs, and tests, so the main design goal is deeper pure helpers with a thin modal adapter rather than more branching inside `src/modal/engine.ts`.

## Goals / Non-Goals

**Goals:**

- Share pending-entry mechanics for `/`, `?`, and `:` without losing Ex visual range/cancel behavior.
- Add backward `?` search as a finite semantic command with default Vim binding.
- Add prompt-local in-memory history for successful searches and executed Ex commands.
- Support empty search recall from the last successful search query.
- Keep literal matching as the default for search and substitution.
- Add explicit bounded regex opt-in for search patterns and Ex substitution patterns.
- Add two-phase Ex substitution match previews/counts before prompt mutation.
- Preserve side-effect boundaries for registers, marks, dot-repeat, search highlights, visual state, Ex messages, cursor placement, and Pi delegation.

**Non-Goals:**

- No full command-line editor: no in-line cursor movement, word delete, paste registers into command-line, or prompt-buffer editing inside the workbench.
- No full Vim search grammar: no offsets, magic modes, `\c`, `\C`, search-and-replace backrefs, or cross-prompt search.
- No Vimscript, expression eval, recursive mappings, `.vimrc`, Neovim Lua, or arbitrary command abbreviations.
- No per-match confirmation loop such as `:s///c`.
- No persistent history across prompts/sessions.
- No new runtime dependencies or regex sandbox claims.

## Decisions

### Decision 1: Add a pure workbench helper and keep modal engine thin

Target seams: new `src/modal/workbench.ts` (or `src/workbench.ts`), `src/modal/types.ts`, `src/modal/engine.ts`, `src/modal/view.ts`, and `src/render.ts`.

The workbench helper will own append/backspace, prefix display, bounded history navigation, preview invalidation, and kind-specific metadata normalization. Modal engine will route keys into the helper and apply returned modal effects.

Alternatives considered:

- Extend `pendingSearch` and `pendingEx` independently. Rejected because history, display prefix, cancellation, and preview invalidation would duplicate logic and further grow `src/modal/engine.ts`.
- Replace all pending modal states with one generic command line. Rejected because visual Ex metadata, operator search, block insert, marks, macros, and repeat state have different side effects and should stay explicit.

### Decision 2: Represent workbench entries as one state shape with kind-specific payload

Target seams: `src/modal/types.ts`, `src/modal/engine.ts`, `src/modal/view.ts`.

Use a state shape like `pendingWorkbench` with:

- `kind: "search" | "ex"`
- `prefix: "/" | "?" | ":"`
- `text`
- optional `historyIndex`
- optional search payload: `direction`, `operator`
- optional Ex payload: `sourceMode`, `visualAnchor`, `visualCursor`, `visualRange`, `preview`

Keep `lastSearch` separate from history because `n`/`N` repeat semantics use the last successful search direction and matcher mode, while history only seeds pending text.

Alternatives considered:

- Store only prefix and infer kind from prefix. Rejected because `:` has visual metadata and search has operator metadata; explicit kind keeps narrowing type-safe.
- Store search history in `lastSearch`. Rejected because history can include older successful queries, while `lastSearch` must stay the repeat-search source of truth.

### Decision 3: Add backward search as its own semantic keymap command

Target seams: `src/types.ts`, `src/config.ts`, `src/commands.ts`, `src/modal/engine.ts`, `docs/settings.md`.

Add `startSearchBackward` with default binding `?`. `/` remains `startSearch`. Insert mode continues delegating both printable characters to Pi. `n` repeats in the last successful search direction; `N` repeats opposite direction.

Alternatives considered:

- Reuse `startSearch` and inspect the triggering key. Rejected because semantic keymap config should not depend on raw default keys.
- Make `?` non-configurable. Rejected because supported finite commands already participate in keymap configuration when possible.

### Decision 4: Make regex mode explicit, bounded, and pattern-only

Target seams: `src/buffer.ts`, `src/ex.ts`, workbench helper, `docs/features.md`.

Literal mode remains default. Search regex mode is opt-in with a `\r` query prefix in the workbench, such as `/\rTODO|FIXME`. Ex substitution regex mode is opt-in with an `r` flag after the replacement delimiter, such as `:%s/foo|bar/baz/gr`. Replacement text remains literal; `&`, `$1`, and `\1` are not expanded.

Bounds are documented constants and enforced before mutation: maximum regex pattern length, maximum prompt text length for regex evaluation, and maximum preview/match count. Invalid patterns, unsupported flags, or exceeded bounds produce readable errors and leave prompt text/cursor/registers unchanged.

Alternatives considered:

- Add global setting to switch search/substitution to regex by default. Rejected because it changes established literal behavior and increases surprise.
- Support JS replacement backrefs in regex substitutions. Rejected because replacement semantics become harder to make safe and Vim-compatible; literal replacement keeps scope finite.
- Add a toggle key while workbench is active. Rejected for v1 because it adds keybinding and display complexity; textual opt-in is testable and copyable in docs.

### Decision 5: Make substitution preview a two-phase Ex flow

Target seams: `src/ex.ts`, `src/buffer.ts`, workbench helper, `src/modal/engine.ts`, `src/render.ts`.

First `Enter` on a valid substitution computes matched target ranges/counts and stores a preview tied to the exact command text and parsed matcher. Prompt text is unchanged; matched targets are highlighted. The Ex row shows match count plus `Enter` apply / `Esc` cancel guidance. Second `Enter` with unchanged command applies the cached parsed substitution. Any command text edit, history navigation, cancellation, or new Ex/search entry clears the preview.

Non-substitution Ex commands keep current one-Enter execution. Substitution errors and no-match results stay non-mutating and do not enter preview state.

Alternatives considered:

- Show counts after immediate substitution only. Rejected because that is not a preview and does not reduce risk for broad prompt edits.
- Implement `:s///c`-style per-match confirmation. Rejected as too broad for this change.
- Recompute and apply without cached preview on second Enter. Rejected because stale preview bugs become harder to reason about; tying preview to exact command text gives a clear invalidation rule.

## Risks / Trade-offs

- Regex can still be expensive in JavaScript despite pattern/input bounds → mitigate with conservative length/count caps, no sandbox claims, and safe error/no-mutation paths.
- Shared workbench can flatten visual Ex behavior → preserve `sourceMode`, `visualAnchor`, `visualCursor`, and `visualRange` in typed Ex payload tests.
- History can confuse repeat search → keep `lastSearch` separate; only successful completed searches update repeat state.
- Preview state can go stale → tie preview to exact command text and clear it on every workbench text/history/cancel transition.
- Modal engine function sizes can exceed project guideline → extract pure helpers before adding large branches; keep each command-specific branch small.
- New config/keymap action can fail live editor construction → update `src/config.ts`, `src/types.ts`, cloneOptions, and live `VimEditor` tests.
- Docs can overclaim Vim parity → document literal default, regex opt-in, hard bounds, and non-goals beside examples.

## Migration Plan

1. Add pure matcher/workbench data types and tests without changing current behavior.
2. Route existing `/` and `:` pending flows through the workbench while preserving current tests.
3. Add `?` keymap action and backward search tests.
4. Add history and empty-query recall tests.
5. Add bounded regex parse/match helpers for search and substitution.
6. Add two-phase substitution preview/apply, then update render/docs.
7. Update `TODOS.md` only after `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict` pass.

Rollback strategy: because behavior is in extension code only, rollback by reverting this change. No data migration or persistent settings migration required.

## Open Questions

- Exact regex bounds should be selected during implementation and documented in `docs/features.md`; suggested starting values are pattern length 256, regex prompt text length 50,000 UTF-16 code units, and preview/match cap 10,000.
- History depth default should be finite and documented; suggested depth is 50 entries for search and 50 for Ex.
- Workbench history navigation should likely use `ArrowUp`/`ArrowDown` first; configurable history keys can remain out of scope unless implementation finds an existing semantic keymap seam that handles them cleanly.
