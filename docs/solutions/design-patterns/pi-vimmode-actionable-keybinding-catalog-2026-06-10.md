---
title: Pi vimmode actionable keybinding catalog
date: 2026-06-10
category: docs/solutions/design-patterns
module: pi-vimmode
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - "Building or changing keybinding discovery UI"
  - "Separating runtime help or Ex command references from actionable key catalogs"
  - "Showing which modes own each effective keybinding"
  - "Testing user-facing catalog output for drift"
related_components:
  - documentation
  - testing_framework
  - runtime-help
  - modal-engine
tags:
  - pi-vimmode
  - keybindings
  - discovery-ui
  - runtime-help
  - popup
  - developer-experience
---

# Pi vimmode actionable keybinding catalog

## Context

The `:keybindings` popup needed to behave like a catalog of keys a user can actually press. The prior shape started with prose (`Effective pi-vimmode keybindings`) and the catalog boundary was easy to blur with runtime help, Ex command references, and diagnostic metadata.

The fixed shape makes the first visible content a grid:

```text
Key            Mode        Action                         Description
```

Each row is a full keybinding row with explicit mode ownership such as `normal`, `n/v`, `n/v/op`, `op`, or `delegated`. Diagnostic and Ex metadata stay out of this popup because they are help topics or commands, not effective keybindings.

Prior session history showed the same risk earlier: `actions` was overloaded across prompt-transform booleans, `:actions` diagnostics, and `keymap.actions`; raw config also could not represent effective bindings, accepted/rejected entries, arguments, or ownership. The correct source for a catalog is resolved/effective binding rows, not registry prose or raw config (session history).

## Guidance

Treat a keybinding catalog as an actionable table, not as a general help page.

Use this split:

1. **Catalog rows are effective bindings.** Every row should answer: key, mode, action, description.
2. **Mode ownership is row data.** Show whether the binding applies in normal, visual, operator-pending, or delegated contexts.
3. **Diagnostic and Ex metadata are excluded.** `:vimmode inspect`, `:vimmode help keybindings`, and similar entries belong in runtime help or command reference surfaces, not in `:keybindings`.
4. **Runtime help remains separate.** Feature discovery can explain recipes, presets, and commands; keybinding discovery should stay narrow and pressable.
5. **Tests assert both inclusion and exclusion.** Verify the grid header and known effective bindings, and also verify that old prose or metadata-only entries do not reappear.

A useful assertion pattern is:

```ts
expect(popupText).not.toContain("Effective pi-vimmode keybindings");
expect(popupText).toContain("Key            Mode        Action");
expect(popupText).toContain("prompt.transform.reflow");
expect(popupText).toContain("gq");
expect(popupText).toContain("no runtime :map");
```

The completed fix was validated through the catalog builder, customization diagnostics, modal command path, and live editor overlay path:

- `test/keybinding-discovery-popup.test.ts`
- `test/customization.test.ts`
- `test/modal.test.ts`
- `test/vim-editor.test.ts`

Full verification also passed:

- `bun test`
- `bun run lint`
- `bun run check-types`
- `bun run format:check`
- `openspec validate add-keybindings-command-ui --strict`
- `openspec validate --specs --strict`
- `graphify update .`

## Why This Matters

Users open `:keybindings` to answer one question: "what key can I press here?" Mixing in command names or diagnostic metadata creates false affordances. It also makes tests brittle because help-copy changes can appear to change keybinding behavior.

A fixed grid with mode ownership prevents three common failures:

- **False discoverability:** commands and help topics look like pressable keys.
- **Mode ambiguity:** users cannot tell whether a binding works in normal, visual, operator-pending, or delegated contexts.
- **Source drift:** runtime help prose, diagnostic metadata, and effective keymap resolution compete as catalog sources.

Keeping the boundary narrow also makes future changes easier: new bindable actions add rows; new help topics do not.

## When to Apply

- Adding or changing keybinding discovery UI.
- Adding configurable prompt transform bindings or protected/delegated shortcuts.
- Showing effective bindings after config parsing, presets, merge rules, or rejected mappings.
- Splitting runtime help from a shortcut catalog.
- Writing tests for popup/catalog output where metadata-only entries might sneak in.

Do not apply this shape to general runtime help, feature discovery, or Ex command reference popups. Those surfaces can include explanatory prose and command topics because they are not claiming to be a list of pressable keys.

## Examples

Before:

```text
Effective pi-vimmode keybindings

prompt.transform.reflow    gq
:vimmode inspect
:vimmode help keybindings
```

Problems:

- The first row is explanatory prose instead of a catalog header.
- No mode ownership is visible.
- Commands and help topics are mixed with keybindings.

After:

```text
Key            Mode        Action                         Description
gq             n/v         prompt.transform.reflow        Reflow prompt prose
/              n/v/op      startSearch                    Search prompt text
Ctrl-R         delegated   redo                           Delegate redo to Pi
```

Benefits:

- First visible content is the grid header.
- Every row represents an effective binding.
- Mode ownership is explicit.
- Runtime help and diagnostics remain separate surfaces.

## Related

- `docs/solutions/design-patterns/pi-vimmode-read-only-help-overlay-ui-2026-06-09.md` — overlay shell for read-only help and discovery surfaces.
- `docs/solutions/architecture-patterns/pi-vimmode-typed-action-registry-keybindings-2026-06-09.md` — typed registry boundary for bindable actions versus metadata-only diagnostics.
- `docs/solutions/documentation-gaps/pi-vimmode-keybinding-discovery-help-topic-boundary-2026-06-09.md` — boundary between keybinding discovery and help topics.
- `docs/solutions/developer-experience/action-keybinding-recipes-for-pivimmode-2026-06-09.md` — feature discovery recipes and action keybinding presets.
- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md` — source-backed runtime help and docs drift prevention.
