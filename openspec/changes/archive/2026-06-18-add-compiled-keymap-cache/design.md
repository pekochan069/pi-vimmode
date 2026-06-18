## Context

`src/commands.ts` owns finite normal-mode command resolution for semantic operators, motions, commands, prompt-transform action bindings, counts, operator-pending grammar, text objects, search entry, and character-search targets. Current helper functions rebuild `Binding[]` through `bindingsFor(keymap)` and rescan `ResolvedVimKeymap` records for exact matches and prefixes during each keypress.

Recent keymap work moved defaults and validation data to descriptors, but resolver lookup still pays repeated `Object.entries()`, `flatMap()`, and `.some()` cost. This change should improve normal-mode dispatch only after a small profile/benchmark confirms resolver lookup is worth optimizing. The parser must keep existing finite, deterministic semantics, especially explicit keymap precedence, operator-first pending parsing, action binding behavior, and Pi-owned insert-mode delegation.

## Goals / Non-Goals

**Goals:**

- Measure current `resolveNormalCommand()` lookup cost for representative default and configured keymaps before refactoring.
- Compile resolver lookup data once per `ResolvedVimKeymap` object identity.
- Replace repeated keymap scans with cached maps/sets while preserving all parser result shapes and pending encodings.
- Cover default behavior, configured overrides, multi-key prefixes, operator grammar, text objects, action bindings, and cache identity with tests.
- Keep implementation inside `src/commands.ts` unless types need a small internal test seam.

**Non-Goals:**

- No new user-visible keybindings or commands.
- No recursive mappings, timeout behavior, `.vimrc`, Vimscript, or Neovim parity.
- No runtime setting or public API change.
- No `VimEditor`, modal engine, buffer helper, docs, or dependency changes unless implementation reveals a focused test need.
- No in-place mutation support for already-resolved keymap objects; resolved options are treated as immutable snapshots.

## Decisions

1. **Cache by `ResolvedVimKeymap` identity with `WeakMap` in `src/commands.ts`.**
   - Target seam: command resolver only.
   - Decision: add `const COMPILED_KEYMAPS = new WeakMap<ResolvedVimKeymap, CompiledKeymap>()` and a `compiledKeymapFor(keymap)` helper.
   - Rationale: settings refresh and option resolution already create resolved keymap objects. Identity-scoped caching avoids global invalidation logic and lets stale keymaps be garbage-collected.
   - Alternatives rejected:
     - Global singleton cache: wrong for concurrent/default/configured keymaps and tests that pass custom keymaps.
     - Stringifying keymaps: expensive, risks dropping action args/functions/shapes, and undermines the performance goal.
     - Mutability-aware invalidation: unnecessary because resolved keymaps should be treated as immutable config snapshots.

2. **Compile resolver-specific lookup tables, not a new parser.**
   - Target seam: `exactBinding()`, `hasLongerPrefix()`, `motionForSequence()`, `hasMotionPrefix()`, `operatorSequenceMatches()`, `hasOperatorPrefix()`, text-object lookup, and command-family helpers.
   - Decision: keep `resolveNormalCommand()` control flow and pending encoders/decoders intact, but replace scan helpers with compiled lookups.
   - Rationale: parser ordering is behavior. Minimizing control-flow changes protects the `ct,` class of bugs where operator-pending grammar must resolve before generic prefix matching.
   - Alternatives rejected:
     - Rewrite resolver as a trie: could be faster, but risks changing exact-vs-prefix precedence and operator namespace behavior.
     - Move cache to config resolution: couples parser internals into `src/config.ts` and complicates action bindings or test keymaps.

3. **Preserve first-match ordering when compiling exact bindings.**
   - Target seam: `bindingsFor()` and `exactBinding()`.
   - Decision: build exact maps by iterating operators, motions, commands, and accepted actions in the same order as `bindingsFor()` and only setting a sequence when absent.
   - Rationale: current duplicate behavior is deterministic because `.find()` returns the first binding. The cache must not let later groups overwrite earlier groups.
   - Alternatives rejected:
     - Last-write-wins maps: could silently change conflicts between operator, motion, command, and action groups.
     - Conflict errors in resolver: validation already handles supported conflicts; resolver must remain tolerant of direct test keymaps.

4. **Compile prefix sets from current string-prefix semantics.**
   - Target seam: generic top-level prefixes and command-family prefixes.
   - Decision: precompute non-empty prefixes for each sequence exactly as the current `.startsWith()` checks observe them, including normalized chord strings such as `ctrl+a`.
   - Rationale: this is a behavior-preserving refactor. Chord-prefix weirdness is currently guarded by operator-first parsing and config precedence cleanup, not by resolver prefix semantics.
   - Alternatives rejected:
     - Treat `ctrl+*` as atomic in resolver now: likely desirable long-term, but it is a behavior change and outside this performance refactor.

5. **Test identity separation through externally observable behavior.**
   - Target seam: public `resolveNormalCommand()` API.
   - Decision: add tests that resolve the same sequence against two distinct keymaps with different semantic actions, and against a newly resolved keymap after a previous keymap has been compiled.
   - Rationale: avoids exporting cache internals only for tests while proving WeakMap identity behavior.
   - Alternatives rejected:
     - Exporting `compileKeymap()` broadly: increases public-looking surface for an internal optimization.
     - Reaching into WeakMap in tests: brittle and not useful for behavior guarantees.

6. **Use profiling as a gate, not a user-facing requirement.**
   - Target seam: benchmark/profiling script or focused test harness.
   - Decision: record before/after timings for representative resolver paths and keep the cache if it improves or at least does not regress the hot paths while all equivalence tests pass.
   - Rationale: TODO explicitly says to explore after profiling. The profile gives evidence for why this internal complexity is worthwhile.
   - Alternatives rejected:
     - Add hard CI timing assertions: likely flaky across machines.
     - Skip measurement: weakens the reason for adding cache complexity.

## Risks / Trade-offs

- Cache stale after in-place keymap mutation → Treat `ResolvedVimKeymap` as immutable; tests should use fresh object identities for changed settings.
- Prefix compilation accidentally changes exact/prefix precedence → Preserve iteration order and current prefix semantics; add focused tests for `g`, `gg`, `ge`, configured single-key overrides, and operator-pending grammar.
- Duplicate sequence behavior changes → Populate exact maps with first-wins semantics matching `bindingsFor().find()`.
- Internal complexity grows in `src/commands.ts` → Keep `CompiledKeymap` small, split compile helpers by lookup family, and avoid rewriting parser control flow.
- Performance benchmark flakes in CI → Use benchmark as evidence/manual script or logged comparison, not a brittle pass/fail threshold unless stable.
- Action binding args captured by reference → Preserve current behavior by storing the same `args` object from accepted action bindings; no cloning in resolver cache.

## Migration Plan

1. Add profiling/benchmark coverage for current resolver paths and record baseline in implementation notes or task output.
2. Add equivalence tests around current parser behavior before changing lookup helpers.
3. Implement `CompiledKeymap` and `compiledKeymapFor()` inside `src/commands.ts`.
4. Route lookup helpers through compiled maps/sets while keeping resolver control flow unchanged.
5. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate add-compiled-keymap-cache --strict`.
6. Rollback strategy: revert the `src/commands.ts` cache changes and keep/adjust the characterization tests if a semantic drift appears.

## Open Questions

- Should the profile live as a temporary implementation note, a checked-in benchmark script, or an extension to an existing measurement script? Default: add a small script only if it is useful and stable enough to keep.
- What before/after improvement is enough to justify the cache? Default: no hard threshold; require clear evidence of lower repeated lookup overhead plus no regression in semantic tests.
