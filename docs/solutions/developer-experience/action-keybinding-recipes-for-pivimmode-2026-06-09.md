---
title: Opt-in action keybinding recipes for pi-vimmode
date: 2026-06-09
last_updated: 2026-06-09
category: docs/solutions/developer-experience
module: pi-vimmode action keybindings
problem_type: developer_experience
component: tooling
severity: low
applies_when:
  - "Adding discoverable opt-in configuration examples for `piVimMode.keymap.actions`"
  - Users need copy-pasteable prompt transform keybinding snippets without changing defaults
  - Runtime help should surface available recipes through finite source-backed discovery
related_components:
  - documentation
  - testing_framework
  - development_workflow
tags:
  - pi-vimmode
  - action-keybindings
  - runtime-help
  - prompt-transforms
  - settings-docs
  - docs-drift
---

# Opt-in action keybinding recipes for pi-vimmode

## Context

`pi-vimmode` already supported finite prompt transform actions through `piVimMode.keymap.actions`, but users still had to assemble useful binding groups from low-level settings docs. That created a developer-experience gap: examples could drift from the real parser, imply default bindings that do not exist, or blur the line between supported configuration and a plugin API.

The `add-action-keybinding-presets` OpenSpec change solved this by adding source-backed, opt-in action keybinding recipes and presets. The recipes are discoverable at runtime through `:features keybindings` and `:features action presets`, documented as copy-pasteable settings snippets or selectable bundles, and guarded by config/runtime/docs-drift tests.

A follow-up default refinement removed the hard-coded `ts` language from the `markdown-wrapping` preset. `gT` now creates a plain Markdown fence by default, while explicit `piVimMode.keymap.actions` config still supports `{ "language": "ts" }` for users who want language-specific fences.

Prior session history pointed at the same direction: bind keys to named prompt actions/transforms, not Vim parity, and keep the feature opt-in to avoid default keymap churn (session history).

## Guidance

Use a small source-backed recipe/preset registry whenever optional keybinding examples need to be discoverable and testable. Do not make examples defaults, and do not turn the recipe list into a plugin API. Keep shared preset defaults neutral: optional args such as code-fence languages should be explicit user config, not bundled preset behavior.

1. **Keep recipes finite and source-backed.** `src/action-keybinding-recipes.ts` owns recipe IDs, titles, summaries, docs anchors, settings snippets, and expected resolved bindings.

   ```ts
   export const ACTION_KEYBINDING_RECIPES = [
     {
       id: "paragraph-editing",
       title: "paragraph editing",
       summary: "reflow with gq, quote with g>, and unquote with g<",
       docsAnchor: "action-keybinding-recipe:paragraph-editing",
       presetDocsAnchor: "action-keybinding-preset:paragraph-editing",
       actions: {
         "prompt.transform.reflow": ["gq"],
         "prompt.transform.quote": ["g>"],
         "prompt.transform.unquote": ["g<"],
       },
       expected: [
         { key: "gq", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
         { key: "g>", actionId: "prompt.transform.quote", args: { action: "quote" } },
         { key: "g<", actionId: "prompt.transform.unquote", args: { action: "unquote" } },
       ],
     },
   ] as const satisfies readonly ActionKeybindingRecipe[];
   ```

2. **Expose recipes and presets through runtime feature discovery.** `src/runtime-help.ts` checks `actionKeybindingRecipeMessage()` before falling back to effective keymap state, action metadata, protected shortcuts, or generic help entries. This keeps `:features keybindings`, `:features action presets`, `:features paragraph-editing`, and `:features markdown-wrapping` compact and bounded.

   Representative output includes `paragraph-editing (paragraph editing): prompt.transform.reflow=gq` and `markdown-wrapping (markdown wrapping): prompt.transform.fence=gT`. If the terminal is narrow, this output may wrap or appear truncated in the visible prompt row. That is a display-width issue, not a recipe-resolution failure.

3. **Document copy-pasteable snippets under the real nested setting shape.** `docs/settings.md` should show complete JSON for `piVimMode.keymap.actions`, not shorthand disconnected from the parser. See the examples below.

4. **Guard recipe drift with tests.** The useful invariant is not only that runtime help mentions recipes. Tests should also prove that source recipe configs parse through the real config resolver and that defaults do not create action bindings.

   ```ts
   const message = runtimeFeaturesMessage("keybindings", context);

   expect(message).toContain("action keybinding recipes");
   expect(message).toContain("opt-in snippets");
   expect(message).toContain("no defaults/plugin API");
   expect(message).toContain("paragraph editing");
   ```

   Drift guards should cover:
   - recipe and preset docs anchors exist;
   - recipe/preset action IDs, keys, and args appear in user docs;
   - source recipe configs parse through the real config parser;
   - default `keymap.actions` stays empty;
   - `piVimMode.keymap.actionPresets` expands before explicit `keymap.actions`;
   - runtime help, feature docs, settings docs, specs, and tests stay aligned.

## Why This Matters

Action keybindings sit across settings parsing, command resolution, prompt transform metadata, runtime help, user docs, OpenSpec requirements, and tests. A finite recipe/preset registry makes optional examples discoverable without expanding the public API surface: users get practical bindings such as `gq`, `g>`, `g<`, and `gT`, while maintainers preserve no default keymap churn, no hidden plugin contract, and parser-backed examples.

Neutral preset defaults matter because presets are perceived as recommended baseline UX. A `markdown-wrapping` preset that silently emits TypeScript fences surprises users writing shell, Python, prose, or generic Markdown. The registry should provide the keybinding shape; language-specific args belong in explicit user overrides.

This pattern also preserves the distinction from the adjacent typed action registry architecture. The typed action registry defines which actions can be bound. The recipe registry defines a few recommended opt-in combinations for those existing actions.

## When to Apply

- Adding discoverable examples for configurable editor behavior.
- Documenting optional keymap/action presets without changing defaults.
- Choosing preset defaults for actions with optional args.
- Runtime help needs to expose supported snippets without implying full Vim parity.
- Docs examples must stay aligned with parser-backed settings.
- OpenSpec acceptance requires docs, runtime discovery, and drift guards.

Do not use this pattern when a binding should become a real default, when third-party extension points are required, or when examples are exploratory and not parser/test backed.

## Examples

### Runtime discovery

```vim
:features keybindings
:features action presets
:features paragraph-editing
:features markdown-wrapping
```

### Paragraph editing recipe

```json
{
  "piVimMode": {
    "keymap": {
      "actions": {
        "prompt.transform.reflow": ["gq"],
        "prompt.transform.quote": ["g>"],
        "prompt.transform.unquote": ["g<"]
      }
    }
  }
}
```

### Markdown wrapping preset

```json
{
  "piVimMode": {
    "keymap": {
      "actionPresets": ["markdown-wrapping"]
    }
  }
}
```

This makes `gT` create a plain fence with no language specifier.

### Markdown wrapping recipe snippet

```json
{
  "piVimMode": {
    "keymap": {
      "actions": {
        "prompt.transform.fence": ["gT"],
        "prompt.transform.quote": ["g>"],
        "prompt.transform.unquote": ["g<"]
      }
    }
  }
}
```

### Explicit language override

The preset intentionally has no default language. Users who want TypeScript fences can still configure the action explicitly:

```json
{
  "piVimMode": {
    "keymap": {
      "actionPresets": ["markdown-wrapping"],
      "actions": {
        "prompt.transform.fence": [{ "key": "gT", "args": { "language": "ts" } }]
      }
    }
  }
}
```

### Verification commands

```bash
bun test test/config.test.ts test/commands.test.ts test/runtime-help.test.ts test/docs-drift.test.ts
bun run check-types
bun run lint
bun run format:check
openspec validate add-action-keybinding-presets --strict
```

## Related

- `docs/solutions/architecture-patterns/pi-vimmode-typed-action-registry-keybindings-2026-06-09.md` — prerequisite action registry/keymap architecture.
- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md` — source-backed runtime help and docs drift guard pattern.
- `docs/settings.md` — user-facing `piVimMode.keymap.actions` snippets.
- `docs/features.md` — feature guide and runtime discovery notes.
- `openspec/changes/add-action-keybinding-presets/` — accepted change artifacts.
