---
title: Add finite pi-vimmode normal commands through descriptors, helpers, and modal wiring
date: 2026-06-19
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding a finite normal-mode command to pi-vimmode"
  - "Keeping Vim-like behavior configurable without implementing full Vim grammar"
  - "Adding prompt-buffer edits that need register and dot-repeat semantics"
related_components:
  - testing_framework
  - documentation
tags: [pi-vimmode, vim-mode, keymap, modal-engine, buffer-helpers, dot-repeat, typescript]
---

# Add finite pi-vimmode normal commands through descriptors, helpers, and modal wiring

## Context

The `add-x-delete-before-cursor` OpenSpec change added Vim-style `X` in normal mode: delete the character before the cursor, support counts such as `3X`, write the deleted text to the character register, participate in dot-repeat, and stay distinct from `Ctrl+X` numeric decrement.

The change was small, but it crossed the same boundaries as larger Vim features: public action types, default keymap descriptors, pure prompt-buffer behavior, modal command dispatch, customization diagnostics, docs, and live editor behavior.

## Guidance

Treat every new normal-mode command as a finite semantic action, not a one-off key branch.

Use the shortest complete path:

1. Add the command to the typed action surface.
2. Add its default binding in `KEYMAP_COMMAND_DESCRIPTORS`.
3. Put text semantics in a pure `src/buffer.ts` helper.
4. Wire `src/modal/normal.ts` through the same register and dot-repeat path as sibling edits.
5. Test one layer at a time: buffer behavior, modal state/effects, live `VimEditor`, and keymap/config diagnostics.
6. Update user docs and release notes in the same change.

For `X`, the descriptor excerpt was intentionally small:

```ts
// excerpt: existing descriptor entries omitted
export const KEYMAP_COMMAND_DESCRIPTORS = {
  deleteChar: { defaults: ["x"] },
  deleteCharBefore: { defaults: ["X"] },
  decrementNumber: { defaults: ["ctrl+x"] },
};
```

This keeps `X` and `Ctrl+X` separate: printable `X` is a delete command; textual control key `ctrl+x` remains numeric decrement.

The buffer helper contract matters more than the implementation: clamp count to the current line, no-op at column zero, return the deleted character-register text, and never delete across line boundaries.

Modal wiring should reuse the same edit-state, register, and repeatable-change path as `x`. Avoid a special branch that mutates prompt text directly or forgets pending named registers.

Public docs then state only the supported finite behavior:

```md
| `x` / `X` | delete character under/before cursor |

3x delete 3 characters under/after cursor
3X delete 3 characters before cursor
```

## Why This Matters

A Vim-looking key can become architectural debt if it bypasses the finite keymap model. Adding it through descriptors and typed actions keeps custom keybindings, diagnostics, docs, runtime command resolution, and tests aligned.

A pure buffer helper keeps edge cases cheap to test: line start is a no-op, counts clamp to the current line, and register text is exactly the deleted slice. Modal code then only translates command intent into state effects.

## When to Apply

- Adding a new normal-mode command with prompt text effects.
- Adding a command that should support counts, registers, or dot-repeat.
- Adding a default key that could be confused with a textual control-key binding.
- Updating Vim parity docs after a finite supported behavior grows.

## Examples

For delete-before-cursor, the minimal working slice was:

- `src/types.ts`: add `deleteCharBefore` to `VimCommandAction`.
- `src/keymap-descriptors.ts`: default `deleteCharBefore` to `X`.
- `src/buffer.ts`: add `deleteCharBefore(text, cursor, count)`.
- `src/modal/normal.ts`: treat it as register-aware and repeatable.
- `docs/features.md` and `RELEASE.md`: document `X`, `3X`, and `Ctrl+X` separation.

Validation used:

```bash
bun test
bun run check-types
bun run lint
bun run format:check
openspec validate --specs --strict
```

## Related

- [Finite Vim keybinding parser with pure buffer helpers](./finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md) — broader pattern this change follows.
- [Prompt buffer operation API for Vim editor adapters](./pi-vimmode-prompt-buffer-operation-api-2026-05-27.md) — why buffer semantics belong behind operation helpers.
- [Compile pi-vimmode keymaps before hot-path command resolution](./pi-vimmode-compiled-keymap-cache-command-resolver-2026-06-18.md) — keymap resolver context for finite command descriptors.
