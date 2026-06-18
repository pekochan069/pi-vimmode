## 1. Baseline and Characterization

- [x] 1.1 Add or extend a small resolver benchmark/profiling path for `resolveNormalCommand()` covering default keymap, configured overrides, multi-key prefixes, operator motions, text objects, search, character search, counts, and action bindings.
- [x] 1.2 Record baseline lookup timing evidence before changing resolver internals; if the benchmark is too flaky for CI, keep it as a manual script or implementation note rather than a hard gate.
- [x] 1.3 Add focused `test/commands.test.ts` characterization coverage for current exact-vs-prefix precedence, operator-pending grammar before generic prefixes, duplicate sequence first-match behavior, action bindings, and text-object lookup.

## 2. Compiled Keymap Cache

- [x] 2.1 Define a private `CompiledKeymap` shape in `src/commands.ts` for exact bindings, global prefixes, motion lookups, operator sequence lookups, text-object kind/target lookups, and command-family lookups.
- [x] 2.2 Add `compiledKeymapFor(keymap)` backed by `WeakMap<ResolvedVimKeymap, CompiledKeymap>` so each resolved keymap identity compiles once and can be garbage-collected.
- [x] 2.3 Compile exact bindings in the same group order as current `bindingsFor()` and preserve first-match behavior for duplicate sequences.
- [x] 2.4 Compile prefix sets from current string-prefix semantics without introducing chord-specific behavior changes.
- [x] 2.5 Compile command-family maps and prefix sets for search entry, operator character search, and repeat character search.

## 3. Resolver Integration

- [x] 3.1 Route `exactBinding()`, `hasLongerPrefix()`, `motionForSequence()`, `hasMotionPrefix()`, `operatorSequenceMatches()`, `hasOperatorPrefix()`, text-object lookup, and command-family helpers through `CompiledKeymap`.
- [x] 3.2 Keep `resolveNormalCommand()` control flow, pending encoders/decoders, count handling, and operator-first pending resolution unchanged except for lookup helper calls.
- [x] 3.3 Add tests proving distinct resolved keymap identities can bind the same sequence to different actions without stale cache contamination.
- [x] 3.4 Add tests proving default and custom keymaps can be resolved in alternating calls without cross-keymap contamination.

## 4. Cleanup and Performance Check

- [x] 4.1 Remove obsolete repeated-scan helpers or narrow them to compile-time helpers only.
- [x] 4.2 Re-run the resolver benchmark/profiling path and record before/after evidence; keep the cache only if hot-path lookup overhead improves or at least does not regress.
- [x] 4.3 Confirm no user-facing docs or settings docs changed because the refactor adds no keybindings, settings, commands, or Vim parity claims.
- [x] 4.4 Run `graphify update .` after implementation code changes.

## 5. Validation

- [x] 5.1 Run `bun test test/commands.test.ts`.
- [x] 5.2 Run `bun test`.
- [x] 5.3 Run `bun run check-types`.
- [x] 5.4 Run `bun run lint`.
- [x] 5.5 Run `bun run format:check`.
- [x] 5.6 Run `openspec validate add-compiled-keymap-cache --strict`.
- [x] 5.7 Run `openspec validate --specs --strict`.
