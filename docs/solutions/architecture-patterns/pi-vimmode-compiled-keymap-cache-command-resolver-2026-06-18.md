---
title: Compile pi-vimmode keymaps before hot-path command resolution
date: 2026-06-18
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "A prompt editor resolves normal-mode commands on every keypress"
  - "Declarative keymaps are stable across many resolver calls"
  - "Exact binding and prefix lookup semantics must preserve Vim grammar precedence"
  - "Custom keymaps must not contaminate default keymap resolution"
tags: [pi-vimmode, command-resolver, keymap, weakmap-cache, performance, vim-grammar, typescript]
---

# Compile pi-vimmode keymaps before hot-path command resolution

## Context

`resolveNormalCommand()` sits on the normal-mode keypress hot path. Before the compiled-keymap refactor, lookup helpers repeatedly flattened bindings or scanned nested keymap records to answer questions such as:

- does this sequence exactly match an operator, motion, command, or action?
- is this sequence a prefix of any longer binding?
- is this pending operator followed by a valid motion, text object, search command, or character-search command?

That behavior was correct, but it made every keypress pay for work that only depends on the resolved keymap. Local benchmark evidence made the cost visible: default keymap resolution was roughly `2835ms` per 100,000 resolutions before the change, versus roughly `45ms` after compiling lookups once.

Related docs already cover finite parser boundaries and keymap precedence:

- [Finite Vim keybinding parser with pure buffer helpers](finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md)
- [Preserve explicit pi-vimmode keymap precedence](../logic-errors/pi-vimmode-config-keymap-precedence-2026-06-17.md)
- [Typed action registry for pi-vimmode keybindings](pi-vimmode-typed-action-registry-keybindings-2026-06-09.md)

This learning is narrower: when a finite parser already has stable semantics, move repeated lookup cost out of the parser path without changing the parser state machine.

## Guidance

Compile each `ResolvedVimKeymap` identity once, then resolve command input through `Map` and `Set` lookups.

```ts
type CompiledKeymap = {
  exactBindings: Map<string, Binding>;
  longerPrefixes: Set<string>;
  motions: { exact: Map<string, VimMotionAction>; longerPrefixes: Set<string> };
  operators: Map<VimOperatorAction, { exact: Set<string>; longerPrefixes: Set<string> }>;
  textObjects: {
    kinds: Map<string, VimTextObjectKind>;
    targets: Map<string, VimTextObjectTarget>;
  };
};
```

Use a `WeakMap` keyed by the resolved keymap object. That keeps the cache identity-safe, avoids manual invalidation, and lets unused keymaps be garbage-collected.

```ts
const COMPILED_KEYMAPS = new WeakMap<ResolvedVimKeymap, CompiledKeymap>();

function compiledKeymapFor(keymap: ResolvedVimKeymap): CompiledKeymap {
  const cached = COMPILED_KEYMAPS.get(keymap);
  if (cached) return cached;
  const compiled = compileKeymap(keymap);
  COMPILED_KEYMAPS.set(keymap, compiled);
  return compiled;
}
```

Preserve duplicate first-match behavior by inserting exact bindings only when the sequence is not already present. Compile groups in the same order the old resolver scanned them.

```ts
function setFirstBinding(bindings: Map<string, Binding>, binding: Binding): void {
  if (!bindings.has(binding.sequence)) bindings.set(binding.sequence, binding);
}

function addLongerPrefixes(prefixes: Set<string>, sequence: string): void {
  for (let index = 1; index < sequence.length; index += 1) {
    prefixes.add(sequence.slice(0, index));
  }
}
```

Then keep hot-path helpers thin:

```ts
function exactBinding(sequence: string, keymap: ResolvedVimKeymap): Binding | undefined {
  return compiledKeymapFor(keymap).exactBindings.get(sequence);
}

function hasLongerPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return compiledKeymapFor(keymap).longerPrefixes.has(sequence);
}

function motionForSequence(
  sequence: string,
  keymap: ResolvedVimKeymap,
): VimMotionAction | undefined {
  return compiledKeymapFor(keymap).motions.exact.get(sequence);
}
```

Keep `resolveNormalCommand()` control flow unchanged. This refactor should not retune:

- parser state machine ordering,
- pending encoders and decoders,
- count handling,
- operator-before-generic-prefix precedence,
- text-object grammar,
- action binding boundaries.

## Why This Matters

Normal-mode command resolution happens for every handled key. Rebuilding candidate binding lists and scanning nested records inside that loop creates latency without adding correctness.

The compiled shape improves runtime while protecting semantics:

- `Map` handles exact binding lookup without array flattening.
- `Set` handles prefix checks without nested scans.
- per-operator maps keep operator-pending grammar scoped.
- command-family maps avoid rediscovering search and character-search bindings on every pending key.
- `WeakMap<ResolvedVimKeymap, CompiledKeymap>` keeps default, global, project, and test keymaps isolated by object identity.

The important design constraint is not just speed. The compiled form must encode the same precedence as the scanner it replaces. Otherwise a performance refactor can reintroduce the exact class of bugs that keymap precedence docs were created to prevent.

## When to Apply

- A resolver or parser repeatedly scans stable configuration on a hot path.
- The resolved configuration object has stable identity across many calls.
- Exact and prefix checks dominate parser work.
- Duplicate or overlapping bindings have intentional precedence rules.
- Custom and default configurations may be used in alternating calls or tests.

Avoid this pattern when the keymap mutates in place after resolution. If mutation is allowed, either freeze resolved keymaps first or rebuild a fresh resolved keymap identity whenever config changes.

## Examples

### Compile command-family lookup separately

Search entry, operator character search, and repeat character search each need exact and prefix answers. Compile those families once rather than filtering all commands during pending resolution.

```ts
function compileCommandFamily<Action extends VimCommandAction>(
  keymap: ResolvedVimKeymap,
  commands: readonly Action[],
  setExact: (sequence: string, command: Action) => void,
  prefixes: Set<string>,
): void {
  for (const command of commands) {
    for (const sequence of keymap.commands[command]) {
      setExact(sequence, command);
      addLongerPrefixes(prefixes, sequence);
    }
  }
}
```

### Characterize cache safety, not only behavior

The tests need to prove both parser semantics and cache isolation:

```ts
test("keeps duplicate sequence resolution first-match deterministic", () => {});
test("resolves operator grammar before unrelated top-level prefixes", () => {});
test("resolves distinct keymap identities without stale command cache", () => {});
test("interleaves default and custom keymap resolution without contamination", () => {});
```

The identity tests catch the failure mode where a compiled lookup table is accidentally global or keyed too broadly.

### Keep the benchmark manual

A local benchmark is useful evidence, but too noisy for a hard CI gate. Keep it as an explicit script:

```json
{
  "scripts": {
    "measure:commands": "bun scripts/measure-command-resolver.ts"
  }
}
```

Use it before and after resolver internals change:

```bash
bun run measure:commands
```

For the compiled-keymap refactor, post-change local output was approximately:

```text
default keymap: 45.04ms for 100,000 resolutions (2,220,337 ops/sec)
configured keymap: 63.40ms for 100,000 resolutions (1,577,381 ops/sec)
```

Keep validation behavior-first: run focused command-parser tests, the full test suite, type/lint/format checks, OpenSpec validation, and `graphify update .` after code changes.

## Related

- [Finite Vim keybinding parser with pure buffer helpers](finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md)
- [Preserve explicit pi-vimmode keymap precedence](../logic-errors/pi-vimmode-config-keymap-precedence-2026-06-17.md)
- [Typed action registry for pi-vimmode keybindings](pi-vimmode-typed-action-registry-keybindings-2026-06-09.md)
