---
title: Implement pi-vimmode case operators with a shared transform path
date: 2026-06-19
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding Vim-style text operators that must work in normal and visual modes"
  - "Keeping parser, keymap, modal, buffer, docs, and tests aligned for a finite editor feature"
  - "Implementing text transforms that should preserve registers and support dot-repeat"
related_components:
  - testing_framework
  - documentation
tags:
  [
    pi-vimmode,
    case-operators,
    vim-mode,
    modal-engine,
    buffer-helpers,
    dot-repeat,
    unicode,
    typescript,
  ]
---

# Implement pi-vimmode case operators with a shared transform path

## Context

The `add-case-operators` OpenSpec change added Vim-style case transforms to `pi-vimmode`: normal-mode `gu`, `gU`, and `g~`, plus visual-mode `u`, `U`, and `~` for characterwise, linewise, and blockwise selections.

The feature looked small, but it crossed the same boundaries as other finite Vim behavior: typed actions, keymap descriptors, parser precedence for `g` prefixes, pure buffer transforms, modal dispatch, dot-repeat, visual cleanup, customization diagnostics, docs, and live editor tests.

## Guidance

Treat case changes as one semantic transform family, not separate key handlers.

Use this shape:

1. Put lowercase, uppercase, and toggle behavior in one pure buffer helper.
2. Apply that helper to character ranges, line ranges, and block ranges.
3. Preserve one-code-point-safe conversion: if JavaScript case conversion changes one input code point into multiple output code points, leave that character unchanged.
4. Add semantic operator actions for the default `gu`, `gU`, and `g~` bindings.
5. Make the parser own `g` prefix ambiguity, doubled line targets, counts, text objects, and configured bindings.
6. Wire normal mode through the same operator-motion path as sibling operators, but do not write registers or enter insert mode.
7. Record successful normal case transforms for `.` repeat.
8. Wire visual `u`, `U`, and `~` through the same helper, then clear selection and return to normal mode.
9. Reject unsupported targets as safe no-ops instead of inventing partial Vim behavior. Parser grammar can be broader than the finite target set modal transform supports.
10. Update docs and tests in the same change.

The important implementation boundary is the buffer helper. Modal code should resolve intent and ranges; buffer code should transform text. That keeps Unicode, ragged block selections, empty ranges, and line clamping cheap to test without editor state.

Normal mode should support the finite target set already supported by the parser and keymap model: motions, text objects, and doubled line targets such as `gugu`, `gUgU`, and `g~g~`. It should deliberately skip targets whose semantics were not implemented for this feature, such as marks, prompt search, and character-search operator targets like `gufx` or `guFx`.

Visual mode should transform only the selected cells or lines. For block selections, do not spill into whole-line behavior just because the operation is line-like in other contexts.

## Why This Matters

Case operators touch many subtle Vim contracts at once: `g` prefix parsing, configurable keymaps, counts, operator-pending state, text objects, visual selections, dot-repeat, registers, and Unicode behavior. Splitting normal and visual implementations would make those contracts drift.

A shared pure transform path gives one place to enforce safety rules. Semantic action descriptors keep customization diagnostics and docs source-backed. Safe no-ops keep unsupported Vim grammar from corrupting editor state.

## When to Apply

- Adding a Vim-style text transform operator.
- Adding behavior that must work in normal mode and visual modes.
- Adding commands that should support dot-repeat but should not touch registers.
- Adding finite Vim grammar where a prefix key has multiple meanings.
- Adding transforms where JavaScript string case conversion can turn one code point into multiple code points, such as `ß` becoming `SS`.

## Examples

Good pattern:

```ts
// modal resolves action and range
// buffer helper owns text transformation
applyCaseTransform(buffer, range, "uppercase");
```

Good behavior checks:

- `guw` lowercases a word.
- `gUiw` uppercases an inner word text object.
- `g~g~` toggles the current line.
- `.` repeats a successful normal-mode case transform at the next valid target.
- Visual `u`, `U`, and `~` preserve registers and return to normal mode.
- Block visual transforms change selected cells only.
- Expanding Unicode case mappings, such as `ß` becoming `SS`, remain unchanged.

Avoid:

- Special-casing `guw` directly in a key handler.
- Duplicating case conversion between normal and visual paths.
- Reusing delete/change/yank paths and accidentally writing registers.
- Treating unsupported targets as half-working commands.
- Applying `toUpperCase()` or `toLowerCase()` without guarding one-code-point-to-many-code-points expansion.

## Related

- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md`
- `docs/solutions/architecture-patterns/pi-vimmode-finite-delete-before-cursor-command-2026-06-19.md`
- `docs/solutions/architecture-patterns/pi-vimmode-typed-action-registry-keybindings-2026-06-09.md`
- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md`
