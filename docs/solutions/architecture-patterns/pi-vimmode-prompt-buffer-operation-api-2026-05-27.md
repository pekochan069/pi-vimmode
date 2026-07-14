---
title: Prompt buffer operation API for Vim editor adapters
date: 2026-05-27
last_updated: 2026-07-14
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Prompt buffer helpers are being composed across modal, render, and adapter layers"
  - "Low-level text helpers need stable operation-level contracts"
  - "Vim editor behavior needs pure buffer APIs with narrow call-site boundaries"
related_components:
  - testing_framework
  - development_workflow
tags:
  - vim-mode
  - prompt-buffer
  - operation-api
  - adapter-boundary
  - modal-engine
  - render-boundary
  - typescript
---

# Prompt buffer operation API for Vim editor adapters

## Context

`pi-vimmode` prompt editing had buffer mechanics leaking across layers. Modal code, render code, adapter code, and tests composed low-level helpers such as splitting text, clamping cursors, normalizing ranges, and extracting selections.

That worked while behavior was small, but it made every caller know prompt-buffer invariants. The fix was to make `src/buffer.ts` expose operation-level APIs and keep low-level text mechanics private.

## Guidance

Expose buffer intent, not buffer mechanics.

Keep low-level helpers private when they only support buffer internals:

```ts
function splitText(text: string): string[] {
  /* internal implementation */
}

function clampPosition(lines: string[], position: Position): Position {
  /* internal implementation */
}
```

Export operations that match actual caller needs:

```ts
normalizeBufferPosition(text, cursor);
navigateBuffer(text, cursor, "matchingPair");
yankVisualSelection(text, anchor, cursor, "char");
isVisualCellSelected(mode, lines, anchor, cursor, lineIndex, col);
```

Use visual operations instead of composing registers in modal code:

```ts
if (!state.visualAnchor) return modeUpdate(state, "normal", options);

const register = yankVisualSelection(
  snapshot.text,
  state.visualAnchor,
  snapshot.cursor,
  linewise ? "line" : "char",
);
```

Use rendering predicates instead of exporting range internals:

```ts
isVisualCellSelected(mode, lines, anchor, cursor, lineIndex, col);
isVisualLineSelected(mode, lines, anchor, cursor, lineIndex);
```

Let view code own display formatting while the buffer API returns prompt text:

```ts
const selected = visualSelectionText(text, anchor, cursor, "line").replace(/\n/g, "↵");
```

## Why This Matters

Operation-level APIs reduce coupling. Callers no longer need to know line splitting, cursor clamping, inclusive visual selection rules, or range normalization details.

Benefits:

- `src/buffer.ts` owns prompt-buffer invariants.
- Modal engine expresses Vim intent, not text surgery.
- Render code asks selection questions, not range math.
- Editor adapter restores cursors through buffer API, not helper internals.
- Tests lock public contracts, not private helper implementation.

Prevention rule: if multiple production callers repeat the same low-level helper composition for one Vim behavior, add one buffer operation instead.

## When to Apply

- Multiple modules import text, range, or cursor helpers from one utility module.
- Tests depend on helper internals more than user-facing behavior.
- Rendering or adapter code duplicates domain logic.
- Refactor goal is sharper module boundaries without changing UX.
- Vim commands need consistent behavior across normal, visual, linewise, and operator-motion flows.

Avoid exporting helper internals unless they represent stable domain concepts, not implementation steps.

## Examples

### Visual yank

Before: caller composes internals.

```ts
const selected = selectionText(text, anchor, cursor);
const register = selected.length > 0 ? { type: "char" as const, text: selected } : undefined;
```

After: caller asks for operation.

```ts
const register = yankVisualSelection(text, anchor, cursor, "char");
```

### Render selection

Before: render owns range math.

```ts
const range = normalizeRange(lines, anchor, cursor);
const pos = { line: lineIndex, col };

return comparePositions(pos, range.start) >= 0 && comparePositions(pos, range.end) <= 0;
```

After: render asks buffer API.

```ts
return isVisualCellSelected(mode, lines, anchor, cursor, lineIndex, col);
```

### Adapter cursor restore

Before: adapter clamps cursor through a low-level helper.

```ts
const target = clampPosition(this.getLines(), position);
```

After: adapter normalizes through prompt-buffer API.

```ts
const target = normalizeBufferPosition(this.getText(), position);
```

### Tests to keep the boundary honest

Cover operation contracts, not helper internals:

- Navigation operations distinguish infallible targets from `matchingPair` misses.
- Visual operations cover charwise and linewise selection behavior.
- Edit operations preserve edge cases such as empty prompts, last-line joins, and empty registers.

## Related

- [Finite Vim keybinding parser with pure buffer helpers](./finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md) — earlier architecture pattern for parser, buffer helper, modal engine, and adapter separation. This doc deepens the buffer boundary into operation-level public APIs.
- [Vim behavior contracts drifted from live adapter behavior](../logic-errors/vim-behavior-contract-drift-2026-05-28.md) — concrete boundary failures, including gating `a` movement from logical line state before emitting native Right.
