---
title: Pi vimmode canonical config and action metadata
date: 2026-07-15
category: architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding finite config leaves or keymap actions"
  - "Avoiding duplicated config/action enumerations across validation and diagnostics"
  - "Defining mapping scopes for descriptor-backed actions"
related_components:
  - documentation
  - development_workflow
tags:
  - pi-vimmode
  - config-metadata
  - action-metadata
  - source-of-truth
  - keymaps
  - typed-registry
---

# Pi vimmode canonical config and action metadata

## Context

Issue #35 needed one typed description of every finite configuration leaf and semantic action without changing Pi vimmode behavior. Existing descriptors, prompt-transform actions, diagnostic actions, and protected-shortcut ownership were already authoritative; duplicating their values in another hand-maintained table would drift.

## Guidance

Compose catalog metadata from current owners. The catalog describes behavior; it does not become a second resolver or config parser.

```ts
...descriptorMetadata("insert", KEYMAP_INSERT_DESCRIPTORS, () => ["insert"]),
...PROMPT_TRANSFORM_ACTIONS.map(({ id, modes }) => ({
  id,
  source: "prompt-transform-registry" as const,
  defaults: [],
  scopes: modes,
  bindable: true,
})),
```

Keep mapping grammar separate from stable editor state. `operatorPending` is a valid mapping scope, but not a `VimMode`.

```ts
export const VIM_MAPPING_SCOPES = [
  "normal",
  "visual",
  "visualLine",
  "visualBlock",
  "insert",
  "operatorPending",
] as const;
```

Encode semantic exceptions at catalog construction. Mark setting begins a mark operation and cannot resolve while an operator is pending; mark jumps can.

```ts
action === "set" ? NORMAL_AND_VISUAL_SCOPES : [...NORMAL_AND_VISUAL_SCOPES, "operatorPending"];
```

Catalog parser-supported finite leaves even when their resolved default is absent. `keymap.actionPresets` is accepted by config parsing but intentionally has no default keymap value.

```ts
"keymap.actionPresets",
```

## Why This Matters

Source-backed metadata prevents separate lists from silently diverging across default cloning, JSON and trusted-JS config, diagnostics, protected-shortcut handling, and command resolution. It preserves finite grammar ownership in existing parser/resolver code while letting consumers inspect one catalog.

## When to Apply

- Adding finite keymap/config options with existing source registries.
- Exposing action/default/scope metadata to diagnostics or discovery features.
- Auditing whether a parser-supported option is missing from a finite inventory.

Do not use this for dynamic runtime state or as a replacement for `src/commands.ts` grammar resolution.

## Examples

Guard catalog coverage with semantic equivalence tests, not only shape snapshots:

```ts
expect(VIM_ACTION_METADATA.map(({ id }) => id).sort()).toEqual(expected);
for (const leaf of CONFIG_LEAVES) {
  expect(leaf.defaultValue).toEqual(valueAtPath(leaf.path));
}
expect(CONFIG_LEAVES.map(({ path }) => path)).toContain("keymap.actionPresets");
```

Verify behavior remains unchanged through config parsing, command resolution, diagnostics, and protected-shortcut tests. Issue #35 passed the full suite: 761 tests plus lint, formatting, and type checking.

## Related

- GitHub issue [#35](https://github.com/pekochan069/pi-vimmode/issues/35)
- `docs/solutions/architecture-patterns/pi-vimmode-typed-action-registry-keybindings-2026-06-09.md` — bindable prompt-transform action registry boundary.
- `docs/solutions/architecture-patterns/pi-vimmode-source-of-truth-seam-refactor-2026-06-25.md` — narrow-owner pattern for finite repeated facts.
- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md` — source-backed discovery/docs drift guards.
