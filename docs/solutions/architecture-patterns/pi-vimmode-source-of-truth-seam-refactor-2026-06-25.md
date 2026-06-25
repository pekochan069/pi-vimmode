---
title: Pi vimmode source of truth seam refactor
date: 2026-06-25
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Keeping diagnostics, runtime help, keymaps, and docs aligned"
  - "Avoiding duplicated user-facing metadata tables"
  - "Sharing keymap grammar between config validation and runtime compilation"
  - "Extracting pure seams during behavior-preserving refactors"
related_components:
  - documentation
  - testing_framework
  - development_workflow
tags:
  - pi-vimmode
  - source-of-truth
  - prompt-transforms
  - diagnostics
  - runtime-help
  - keymap-grammar
  - visual-selection
  - docs-drift
---

# Pi vimmode source of truth seam refactor

## Context

`pi-vimmode` had a behavior-preserving architecture pass with four drift-prone seams: keymap grammar, prompt transform diagnostics, runtime help drift anchors, and visual-selection helpers. The review found two important gaps after the initial refactor: disabled prompt transform diagnostics disappeared instead of remaining discoverable as disabled, and the new keymap grammar helper fed config diagnostics but not runtime keymap compilation.

The completed fix made each repeated fact owned by one narrow source, then reused that source from runtime, diagnostics, help, and tests.

## Guidance

Use the smallest internal source of truth that can serve every existing surface. Do not add a new public API or broad abstraction when a typed registry or finite enumeration helper is enough.

Applied shape:

- Diagnostics iterate the prompt-transform action registry from `src/prompt-transform-actions.ts` and render canonical ID, description, args, and disabled state.
- Keymap config validation and runtime compilation share finite grammar enumeration from `src/keymap-grammar.ts`.
- Runtime help keeps a strict internal registry for docs/spec/test anchors while leaving the exported entry type compatible.
- Visual helpers move to a pure seam; old-module re-exports stay only where they avoid churn.

## Why This Matters

Hidden disabled features look like missing features. Discovery surfaces should explain effective current state, including disabled features.

Duplicated grammar extraction drifts. Config can reject a key that runtime accepts, runtime can ignore a shape diagnostics approved, or help can describe stale command names. A single finite source prevents those mismatches without expanding scope into Vim parity.

This pattern also keeps refactors lazy in the useful sense: extract one pure seam, wire all consumers to it, and leave behavior unchanged.

## When to Apply

- When feature metadata drives runtime behavior, diagnostics, and help output.
- When disabled or invalid configuration should remain discoverable.
- When grammar or binding rules appear in more than one file.
- When docs drift tests need source-owned anchors instead of fixture-owned copies.
- When a behavior-preserving refactor can move pure helpers behind compatibility exports.

Skip this for one-off local behavior with no diagnostics, help, docs, or config surface.

## Examples

### Prompt transform diagnostics

`src/customization.ts` now iterates the prompt-transform action registry from `src/prompt-transform-actions.ts`, emits `argSummary` and `disabledReason`, and removes the duplicate prompt-transform description table. `src/runtime-help.ts` delegates transform feature details to `actionsMessage` instead of special-casing reflow and quote.

Tests in `test/customization.test.ts` and `test/runtime-help.test.ts` cover disabled `prompt.transform.reflow`, canonical IDs, argument summary output such as `width?:integer`, renamed Ex command discovery, and no legacy `promptTransform.*` leakage.

### Keymap grammar

`src/keymap-grammar.ts` exposes typed `grammarEntriesForKeymap` and `grammarBindingsForKeymap`. `src/config.ts` uses bindings and conflict helpers for duplicate and prefix-shadow diagnostics; `src/commands.ts` uses entries while compiling runtime bindings. This keeps parser behavior and config warnings on the same finite grammar source.

### Runtime help anchors

`src/runtime-help.ts` keeps public `RuntimeHelpEntry` anchors optional for compatibility while internal registry entries require docs/spec/test anchors. Drift tests read from the registry instead of a second support table.

### Visual selection seam

`src/visual-selection.ts` owns normalized visual ranges, selected text, summaries, and render mapping helpers. `src/buffer.ts` re-exports compatibility wrappers so callers do not need a broad migration in one commit.

## Related

- `docs/solutions/architecture-patterns/pi-vimmode-typed-action-registry-keybindings-2026-06-09.md`
- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md`
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md`
- `docs/solutions/architecture-patterns/pi-vimmode-compiled-keymap-cache-command-resolver-2026-06-18.md`
- `docs/solutions/logic-errors/pi-vimmode-customization-diagnostics-edge-cases-2026-06-04.md`

## Prevention

- Make disabled-state tests first-class; do not only test enabled happy paths.
- Prefer registry-owned metadata over diagnostics-specific description tables.
- Use one typed enumeration helper when runtime and config both walk the same keymap structure.
- Keep compatibility exports during pure seam extraction unless deleting them is proven safe.
- Run the standard project gate after seam refactors.
