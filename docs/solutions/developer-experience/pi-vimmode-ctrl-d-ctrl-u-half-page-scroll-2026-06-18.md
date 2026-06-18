---
title: Add mode-aware Ctrl-D and Ctrl-U scroll motions to pi-vimmode
date: 2026-06-18
category: docs/solutions/developer-experience
module: pi-vimmode
problem_type: developer_experience
component: tooling
severity: low
applies_when:
  - "Adding Vim control-key bindings that overlap Pi or terminal shortcuts"
  - "Adding motions that should work in normal and visual modes but not operator-pending mode"
  - "Adding prompt-local motion behavior that depends on terminal viewport size"
related_components:
  - "keymap-configuration"
  - "modal-dispatch"
  - "runtime-keybinding-discovery"
tags: [pi-vimmode, keybindings, scrolling, protected-keys, modal, typescript]
---

# Add mode-aware Ctrl-D and Ctrl-U scroll motions to pi-vimmode

## Context

pi-vimmode needed Vim-style half-page scroll keys: `Ctrl-D` for down and `Ctrl-U` for up. The catch: these keys are also meaningful to Pi or terminal editing, so treating them as globally Vim-owned would break insert-mode behavior.

The feature was implemented as semantic motions, not raw key branches. Normal and visual modes own the scroll behavior. Insert mode still delegates to Pi.

## Guidance

Add control-key Vim behavior through the existing semantic keymap pipeline:

- describe the action in `src/keymap-descriptors.ts`
- validate protected keys in `src/config.ts` only for the exact owning action
- keep invalid operator-pending combinations out of `operatorMotions`
- put cursor math in a pure buffer helper
- pass only the viewport fact modal logic needs (`terminalRows`)
- let normal and visual modes share `moveUpdate`

Config validation makes the protected-key exception narrow:

```ts
allowProtectedKey: (key) =>
  group === "motions" &&
  ((action === "halfPageDown" && key === "ctrl+d") ||
    (action === "halfPageUp" && key === "ctrl+u")),
```

Operator motions deliberately exclude scroll. Scroll sizing uses the live terminal row count from the snapshot and clamps through `moveByPromptLines`.

## Why This Matters

Control keys need mode-aware ownership. A global protected-shortcut rule is easy to write, but it steals behavior from insert mode and Pi-owned contexts.

Keeping `Ctrl-D` / `Ctrl-U` as semantic motions also keeps the system coherent:

- keymap customization, diagnostics, and runtime discovery all describe the same action IDs
- counts work through the existing parser (`2<C-d>`)
- visual mode preserves anchor behavior through existing motion update code
- operator-pending mode rejects unsupported `d<C-d>` / `y<C-u>` safely
- docs drift tests can verify the action names and defaults

## When to Apply

Use this pattern when a new Vim binding:

- uses a protected or terminal-reserved control key
- is valid only in specific Vim modes
- should be configurable by semantic action name
- needs viewport context but should not couple buffer code to the editor
- should be discoverable through `:mapcheck`, keybinding catalogs, and settings docs

## Examples

Manual behavior to verify:

```text
Esc        enter normal mode
Ctrl-D     move down half a visible prompt page
Ctrl-U     move up half a visible prompt page
2 Ctrl-D   move down two half-pages
v Ctrl-D   extend visual selection down while preserving the anchor
i Ctrl-D   delegate to Pi/insert-mode behavior, not Vim scroll
```

Regression checks cover buffer clamping, parsing/counts, protected-key validation, modal ownership, and runtime catalog diagnostics.

## Related

- `docs/solutions/logic-errors/pi-vimmode-config-keymap-precedence-2026-06-17.md` — related keymap precedence and clone drift guardrails
- `docs/solutions/architecture-patterns/pi-vimmode-typed-action-registry-keybindings-2026-06-09.md` — semantic action registry and protected shortcut guidance
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — finite parser and buffer-helper boundary
- `docs/solutions/logic-errors/pi-vimmode-customization-diagnostics-edge-cases-2026-06-04.md` — key normalization and runtime diagnostics
