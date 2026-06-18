## Why

Normal-mode command resolution rebuilds binding lists and scans configured keymap records on each keypress. The remaining TODO is to prove that lookup work is a hotspot and, if it is, compile the resolved keymap once so normal-mode dispatch stays fast without changing Vim semantics.

## What Changes

- Add profiling or a targeted benchmark around `resolveNormalCommand()` for default and configured keymaps before changing resolver internals.
- Introduce a compiled keymap lookup cache keyed by `ResolvedVimKeymap` identity, using `WeakMap<ResolvedVimKeymap, CompiledKeymap>` so live config objects can be garbage-collected.
- Compile exact sequence lookups, prefix sets, motion/operator lookups, text-object kind/target maps, and command-family sequence sets used by operator search, character search, repeat search, and generic command resolution.
- Route normal-mode resolution helpers through the compiled structure while preserving current precedence, pending-state encoding, counts, operators, motions, text objects, action bindings, and invalid-key behavior.
- Add equivalence tests and cache-invalidation tests so changed keymap identities compile separately and existing semantic parser behavior remains unchanged.
- Non-goals: no new keybindings, no recursive mappings, no timeout behavior, no runtime settings changes, no Vimscript/Neovim parity, and no runtime dependency changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-keymap-configuration`: Add a behavior-preserving resolver-performance contract for compiled keymap lookups, cache identity, and semantic equivalence.

## Impact

- Affected code: `src/commands.ts` resolver lookup helpers; possibly `src/types.ts` if an internal `CompiledKeymap` type is exported for tests.
- Tests: update `test/commands.test.ts` with resolver equivalence, prefix precedence, operator grammar, text-object lookup, action binding, and distinct keymap identity coverage; add or update a small benchmark/profiling script if useful.
- Docs/API: no user-facing docs, public settings, command syntax, or Pi extension API changes expected.
- Dependencies: no new runtime or peer dependencies.
- Compatibility: no breaking changes; existing settings, default keybindings, pending-prefix behavior, and invalid-key safety must keep working.
