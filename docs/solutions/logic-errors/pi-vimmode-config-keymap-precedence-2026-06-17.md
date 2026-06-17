---
title: Preserve explicit pi-vimmode keymap precedence
date: 2026-06-17
last_updated: 2026-06-17
category: docs/solutions/logic-errors
module: pi-vimmode
problem_type: logic_error
component: tooling
symptoms:
  - "Explicit user or project keybindings can still be shadowed by lower-priority default bindings"
  - "A configured `q` prefix can enter macro recording instead of the intended prompt transform or motion path"
  - "Config-only tests can pass while live editor option cloning misses newly added nested option branches"
root_cause: config_error
resolution_type: code_fix
severity: medium
related_components:
  - "config-resolver"
  - "vim-editor-adapter"
  - "keymap-parser"
  - "openspec"
tags: [pi-vimmode, config, keymap, precedence, clone-helpers, typescript]
---

# Preserve explicit pi-vimmode keymap precedence

## Problem

Explicit user or project keymap bindings must beat lower-priority defaults. The resolver merged configured groups over default groups, but it did not remove the same key sequence from other top-level default groups first.

That made exact top-level overrides unsafe. For example, mapping `q` as a motion could still collide with the default macro-record binding on `q`.

## Symptoms

- A configured key such as `q` could still be owned by `macros.record` in the resolved keymap.
- Duplicate binding warnings were not the right behavior for explicit user/project overrides: the configured binding should win over defaults.
- Live editor option cloning had a second hand-written field list, so new nested option branches could drift between config resolution and `VimEditor` construction.

## What Didn't Work

- Plain object merging only replaced the configured group:

  ```ts
  target.motions = { ...target.motions, ...partial.motions };
  target.commands = { ...target.commands, ...partial.commands };
  target.macros = { ...target.macros, ...partial.macros };
  ```

  This leaves unrelated default groups untouched. A configured motion on `q` can coexist with default macro record on `q`.

- Treating every duplicate as a conflict was too strict. Explicit user/project top-level keymap settings are a priority override, not an invalid duplicate, when the duplicate comes from lower-priority defaults.

- Duplicating deep-clone logic in the editor adapter was fragile. Earlier docs already captured adapter drift as a recurring failure mode: `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md`.

Session history search found no directly relevant prior attempts for this exact precedence fix.

## Solution

Centralize resolved option cloning, then make `mergeKeymap` remove explicit top-level sequences from lower-priority resolved defaults before applying the partial config.

`src/config.ts` now collects explicit top-level keymap sequences from configured operators, motions, macros, marks, and commands. It deliberately skips `commands.showKeybindings` because that command has its own conflict rejection path.

```ts
function configuredTopLevelKeymapSequences(partial: PartialKeymapOptions): Set<string> {
  const sequences = new Set<string>();
  for (const group of [partial.operators, partial.motions, partial.macros, partial.marks]) {
    for (const bindings of Object.values(group ?? {})) {
      for (const sequence of bindings ?? []) sequences.add(sequence);
    }
  }
  for (const [command, bindings] of Object.entries(partial.commands ?? {})) {
    if (command === "showKeybindings") continue;
    for (const sequence of bindings ?? []) sequences.add(sequence);
  }
  return sequences;
}
```

The resolver filters those sequences out of every top-level resolved keymap group before merging the explicit partial:

```ts
function removeTopLevelKeymapSequences(target: ResolvedVimKeymap, sequences: Set<string>): void {
  if (sequences.size === 0) return;
  const remove = <K extends string>(record: Record<K, readonly string[]>): Record<K, string[]> => {
    const next = {} as Record<K, string[]>;
    for (const action of Object.keys(record) as K[]) {
      next[action] = record[action].filter((binding) => !sequences.has(binding));
    }
    return next;
  };

  target.operators = remove(target.operators);
  target.motions = remove(target.motions);
  target.commands = remove(target.commands);
  target.macros = remove(target.macros);
  target.marks = remove(target.marks);
}

function mergeKeymap(target: ResolvedVimKeymap, partial: PartialKeymapOptions): void {
  removeTopLevelKeymapSequences(target, configuredTopLevelKeymapSequences(partial));
  if (partial.operators) target.operators = { ...target.operators, ...partial.operators };
  if (partial.motions) target.motions = { ...target.motions, ...partial.motions };
  if (partial.commands) target.commands = { ...target.commands, ...partial.commands };
  if (partial.macros) target.macros = { ...target.macros, ...partial.macros };
  if (partial.marks) target.marks = { ...target.marks, ...partial.marks };
}
```

A later refactor data-drove default keymaps from `src/keymap-descriptors.ts`, but exposed a second precedence edge case: applying global and project keymap layers sequentially made a lower-priority global conflict permanently delete a default binding before the higher-priority project layer could override it. Example:

```ts
resolveVimOptions(
  { piVimMode: { keymap: { motions: { wordForward: ["q"] } } } },
  { piVimMode: { keymap: { motions: { wordForward: ["e"] } } } },
);
```

Expected final state:

```ts
motions.wordForward === ["e"];
macros.record === ["q"];
```

The fix was to overlay configured keymap layers first, then replay the final effective overlay onto a fresh default keymap once:

```ts
function mergeKeymapOverlay(target: PartialKeymapOptions, partial: PartialKeymapOptions): void {
  if (partial.operators) target.operators = { ...target.operators, ...partial.operators };
  if (partial.motions) target.motions = { ...target.motions, ...partial.motions };
  if (partial.commands) target.commands = { ...target.commands, ...partial.commands };
  if (partial.macros) target.macros = { ...target.macros, ...partial.macros };
  if (partial.marks) target.marks = { ...target.marks, ...partial.marks };
  // textObjects/operatorMotions/actions omitted here for brevity; keep them in source.
}

function resolveKeymapFromLayers(layers: PartialKeymapOptions[]): ResolvedVimKeymap {
  const overlay: PartialKeymapOptions = {};
  for (const layer of layers) mergeKeymapOverlay(overlay, layer);

  const keymap = cloneKeymap();
  mergeKeymap(keymap, overlay);
  return keymap;
}
```

The defaults and validation sets are now descriptor-derived from `src/keymap-descriptors.ts`, so command, motion, macro, mark, and text-object defaults have one descriptor module instead of duplicated literal arrays.

Regression coverage now includes `test/config.test.ts` asserting that project override restores defaults removed by global-only conflicts:

```ts
expect(result.options.keymap?.motions.wordForward).toEqual(["e"]);
expect(result.options.keymap?.macros.record).toEqual(["q"]);
```

The clone logic now lives in one exported helper:

```ts
export function cloneResolvedVimOptions(
  options: ResolvedVimEditorOptions = DEFAULT_VIM_OPTIONS,
): ResolvedVimEditorOptions {
  return {
    preset: options.preset,
    startMode: options.startMode,
    cursor: { ...options.cursor },
    keymap: options.keymap ? cloneKeymap(options.keymap) : undefined,
    ui: options.ui ? cloneUi(options.ui) : undefined,
    macros: options.macros ? cloneMacros(options.macros) : undefined,
    marks: options.marks ? cloneMarks(options.marks) : undefined,
    search: options.search ? cloneSearch(options.search) : undefined,
    feedback: options.feedback ? cloneFeedback(options.feedback) : undefined,
    promptStructures: options.promptStructures
      ? clonePromptStructures(options.promptStructures)
      : undefined,
    promptTransforms: options.promptTransforms
      ? clonePromptTransforms(options.promptTransforms)
      : undefined,
  };
}
```

`src/vim-editor.ts` delegates adapter cloning to that helper:

```ts
function cloneOptions(options: ResolvedVimEditorOptions): ResolvedVimEditorOptions {
  return cloneResolvedVimOptions(options);
}
```

Regression coverage was added at both resolver and runtime boundaries:

- `test/config.test.ts` verifies explicit keymap bindings override lower-priority default top-level bindings and leave `macros.record` empty when `q` is reassigned.
- `test/commands.test.ts` verifies an explicit motion binding wins over default macro record binding.
- `test/vim-editor.test.ts` verifies live editor option cloning propagates configured keymap and prompt transform branches.

## Why This Works

The resolver now matches the intended priority model:

1. Parse user and project config into partial keymap settings.
2. Overlay partial settings by priority so higher-priority project settings replace lower-priority global settings before default conflict removal runs.
3. Start with cloned defaults.
4. For each explicit top-level sequence in the final effective overlay, remove that sequence from lower-priority default top-level groups.
5. Merge the final effective overlay into the target.

So a sequence cannot remain both a default macro and a configured motion or command. A lower-priority conflict also cannot permanently remove a default that should be restored when a higher-priority layer moves away from that key. `q` correctly returns to macro recording when no final effective binding claims `q`.

Centralizing cloning also means config resolution and live editor construction use the same nested-field semantics. New option branches only need to be added to `cloneResolvedVimOptions`, not to separate adapter-local clone lists.

## Prevention

- When adding a new top-level keymap group, update `mergeKeymapOverlay`, `configuredTopLevelKeymapSequences`, and `removeTopLevelKeymapSequences` together.
- Prefer descriptor-derived defaults and validation sets over duplicated literal action arrays. Add descriptor tests when introducing a new keymap family.
- Add regression tests for any default single-key binding that can also be used as a configured prefix (`q`, `g`, `z`, `@`). Include both “configured binding wins” and “higher-priority override restores default” cases.
- Test both resolved config shape and runtime input parsing. Config shape proves precedence; runtime tests prove parser branches obey it.
- Keep resolved option cloning centralized in `cloneResolvedVimOptions`; do not reintroduce adapter-local field-by-field clone lists.
- Preserve special-case validation for `showKeybindings` separately from general precedence removal.

## Related Issues

- `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md` — prior live-adapter clone drift pattern.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — parser precedence failures around keybinding dispatch.
- `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md` — config surface source-of-truth guidance.
- `docs/solutions/architecture-patterns/pi-vimmode-typed-action-registry-keybindings-2026-06-09.md` — prompt transform/action keybinding registry context.
