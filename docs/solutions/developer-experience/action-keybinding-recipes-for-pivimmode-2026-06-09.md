---
title: Opt-in action keybinding recipes for pi-vimmode
date: 2026-06-09
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

The `action-keybinding-presets` OpenSpec change solved this by adding source-backed, opt-in action keybinding recipes. The recipes are discoverable at runtime through `:features keybindings`, documented as copy-pasteable settings snippets, and guarded by config/runtime/docs-drift tests.

Prior session history pointed at the same direction: bind keys to named prompt actions/transforms, not Vim parity, and keep the feature opt-in to avoid default keymap churn (session history).

## Guidance

Use a small source-backed recipe registry whenever optional keybinding examples need to be discoverable and testable. Do not make examples defaults, and do not turn the recipe list into a plugin API.

1. **Keep recipes finite and source-backed.** `src/action-keybinding-recipes.ts` owns recipe IDs, titles, summaries, docs anchors, settings snippets, and expected resolved bindings.

   ```ts
   export const ACTION_KEYBINDING_RECIPES = [
     {
       id: "paragraph-editing",
       title: "paragraph editing",
       summary: "reflow with gq, quote with g>, and unquote with g<",
       actions: {
         "prompt.transform.reflow": ["gq"],
         "prompt.transform.quote": ["g>"],
         "prompt.transform.unquote": ["g<"],
       },
       docsAnchor: "action-keybinding-recipe:paragraph-editing",
       expected: [
         { key: "gq", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
         { key: "g>", actionId: "prompt.transform.quote", args: { action: "quote" } },
         { key: "g<", actionId: "prompt.transform.unquote", args: { action: "unquote" } },
       ],
     },
   ] as const satisfies readonly ActionKeybindingRecipe[];
   ```

2. **Expose recipes through runtime feature discovery.** `src/runtime-help.ts` checks `actionKeybindingRecipeMessage()` before falling back to effective keymap state, action metadata, protected shortcuts, or generic help entries. This keeps `:features keybindings`, `:features paragraph-editing`, and `:features markdown-wrapping` compact and bounded.

   Representative output includes `paragraph editing: prompt.transform.reflow=gq` and `markdown wrapping: prompt.transform.fence=gT`. If the terminal is narrow, this output may wrap or appear truncated in the visible prompt row. That is a display-width issue, not a recipe-resolution failure.

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
   - recipe docs anchors exist;
   - recipe action IDs and keys appear in user docs;
   - source recipe configs parse through the real config parser;
   - default `keymap.actions` stays empty;
   - runtime help, feature docs, settings docs, specs, and tests stay aligned.

## Why This Matters

Action keybindings sit across settings parsing, command resolution, prompt transform metadata, runtime help, user docs, OpenSpec requirements, and tests. A finite recipe registry makes optional examples discoverable without expanding the public API surface: users get practical bindings such as `gq`, `g>`, `g<`, and `gT`, while maintainers preserve no default keymap churn, no hidden plugin contract, and parser-backed examples.

This pattern also preserves the distinction from the adjacent typed action registry architecture. The typed action registry defines which actions can be bound. The recipe registry defines a few recommended opt-in combinations for those existing actions.

## When to Apply

- Adding discoverable examples for configurable editor behavior.
- Documenting optional keymap/action presets without changing defaults.
- Runtime help needs to expose supported snippets without implying full Vim parity.
- Docs examples must stay aligned with parser-backed settings.
- OpenSpec acceptance requires docs, runtime discovery, and drift guards.

Do not use this pattern when a binding should become a real default, when third-party extension points are required, or when examples are exploratory and not parser/test backed.

## Examples

### Runtime discovery

```vim
:features keybindings
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

### Markdown wrapping recipe

```json
{
  "piVimMode": {
    "keymap": {
      "actions": {
        "prompt.transform.fence": [{ "key": "gT", "args": { "language": "ts" } }],
        "prompt.transform.quote": ["g>"],
        "prompt.transform.unquote": ["g<"]
      }
    }
  }
}
```

### Verification commands

```bash
bun test test/config.test.ts test/runtime-help.test.ts test/docs-drift.test.ts
openspec validate action-keybinding-presets --strict
```

## Related

- `docs/solutions/architecture-patterns/pi-vimmode-typed-action-registry-keybindings-2026-06-09.md` — prerequisite action registry/keymap architecture.
- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md` — source-backed runtime help and docs drift guard pattern.
- `docs/settings.md` — user-facing `piVimMode.keymap.actions` snippets.
- `docs/features.md` — feature guide and runtime discovery notes.
- `openspec/changes/action-keybinding-presets/` — accepted change artifacts.
