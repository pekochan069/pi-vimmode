---
title: "Ex command autocomplete simplification"
date: 2026-06-23
category: design-patterns
module: vim-mode
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - "inline logic already covers the feature adequately"
  - "exported helper functions add indirection without clarity"
tags:
  - ponytail
  - yagni
  - autocomplete
  - vim-mode
  - over-engineering
---

# Ex command autocomplete simplification

## Context

pi-vimmode's Ex command autocomplete dropdown started with an exported function per UI operation: `suggestExCommandsForPending` to get candidates, `selectNextSuggestion`/`selectPreviousSuggestion` to cycle, `acceptSelectedSuggestion` to apply, plus `completePendingExCommand` for Tab-completion and `exCommandWordBoundaries` as a shared helper. Every Up/Down/Tab keypress called a two-step chain: first compute suggestions, then call a selection function that recomputed the same suggestions internally. The return type carried an unused `preview?: ExSubstitutionPreview` field. Theme types required properties that runtime code already treated as optional. Eight tests covered the same completion path with minor parameter variations.

The TODO list tracked "ex command autocomplete" as a planned feature. The initial implementation delivered the feature but introduced unnecessary indirection that a ponytail review caught.

## Guidance

**Inline index math in handlers. Avoid recomputing shared state across function boundaries.**

Each key handler should call the suggestion computation once, then perform the index math or accept logic inline. Never export a function-per-UI-operation when each operation is a one-liner on top of the same shared computation.

Before (over-engineered):

```ts
export function selectPreviousSuggestion(
  pendingEx: PendingExCommand,
  options: ModalOptions,
): PendingExCommand {
  const suggestions = suggestExCommandsForPending(pendingEx, options); // recomputes
  const current = pendingEx.selectedSuggestion ?? suggestions.length;
  return {
    ...pendingEx,
    selectedSuggestion: (current - 1 + suggestions.length) % suggestions.length,
  };
}

export function selectNextSuggestion(
  pendingEx: PendingExCommand,
  options: ModalOptions,
): PendingExCommand {
  const suggestions = suggestExCommandsForPending(pendingEx, options); // recomputes
  const current = pendingEx.selectedSuggestion ?? -1;
  return { ...pendingEx, selectedSuggestion: (current + 1) % suggestions.length };
}

export function acceptSelectedSuggestion(
  pendingEx: PendingExCommand,
  options: ModalOptions,
): { command: string; cursor: number } | undefined {
  const suggestions = suggestExCommandsForPending(pendingEx, options); // recomputes
  const selected = pendingEx.selectedSuggestion ?? 0;
  if (selected >= suggestions.length) return undefined;
  const boundaries = exCommandWordBoundaries(
    pendingEx.command,
    exCursor(pendingEx),
    pendingEx.visualRange,
  );
  const range = boundaries ? pendingEx.command.slice(0, boundaries.left) : "";
  return { command: range + suggestions[selected], cursor: (range + suggestions[selected]).length };
}
```

After (inlined):

```ts
if (keyMatches(data, "up")) {
  if (pendingEx.command) {
    const suggestions = suggestExCommandsForPending(pendingEx, options); // one call
    if (suggestions.length > 0) {
      const current = pendingEx.selectedSuggestion ?? suggestions.length;
      return invalidate({
        ...state,
        pendingEx: {
          ...pendingEx,
          selectedSuggestion: (current - 1 + suggestions.length) % suggestions.length,
        },
      });
    }
  }
  return invalidate(navigateExHistory(state, pendingEx, "previous"));
}

if (keyMatches(data, "tab") || data === "\t") {
  const suggestions = suggestExCommandsForPending(pendingEx, options); // one call
  if (suggestions.length > 0) {
    const selected = pendingEx.selectedSuggestion ?? 0;
    if (selected < suggestions.length) {
      const boundaries = exCommandWordBoundaries(
        pendingEx.command,
        exCursor(pendingEx),
        pendingEx.visualRange,
      );
      const range = boundaries ? pendingEx.command.slice(0, boundaries.left) : "";
      const newCommand = range + suggestions[selected];
      return invalidate({
        ...state,
        pendingEx: editPendingEx(pendingEx, newCommand, newCommand.length),
      });
    }
  }
  const completed = completePendingExCommand(pendingEx, options);
  if (!completed) return invalidate(state);
  return invalidate({
    ...state,
    pendingEx: editPendingEx(pendingEx, completed.command, completed.cursor),
  });
}
```

Keep `suggestExCommandsForPending` private. Keep `exCommandWordBoundaries` private. Export only `completePendingExCommand` if external callers need standalone completion without the dropdown context.

Also: remove unused return fields, make type properties match runtime optionality, and trim tests that cover the same code path.

## Why This Matters

1. **One computation per keypress.** Each handler calls `suggestExCommandsForPending` once. The old chain called it 2-3 times per keypress because each exported selection function recomputed independently.

2. **Fewer exports = smaller API surface.** Three deleted exports (`selectNextSuggestion`, `selectPreviousSuggestion`, `acceptSelectedSuggestion`) were never called from outside the file. Exporting them implied they were part of the public contract.

3. **Unused fields lie.** `preview?: ExSubstitutionPreview` on the return type suggested callers should handle preview state. No caller did. Dead fields create false assumptions about what the API supports.

4. **Type optionality must match runtime behavior.** Theme type properties that code treats as optional via `??` fallbacks should be typed as optional. Required fields with runtime fallbacks are a bug waiting to happen when a new consumer skips the fallback.

5. **Test density.** Eight tests covering the same completion path with minor parameter variations test the same code path. Four tests that cover distinct paths (empty prefix, prefix match, range-prefixed command, argument cutoff) give real coverage.

## When to Apply

- When a keypress handler calls a chain of exported functions that each recompute the same input.
- When exported functions are only called from within the same file.
- When return types include fields no caller reads.
- When type definitions require properties that runtime code treats as optional with `??` or `||` fallbacks.
- When test count exceeds the number of distinct code paths by more than 2x.

## Examples

**Before: return type with unused field.**

```ts
export function completePendingExCommand(...): {
  command: string;
  cursor: number;
  preview?: ExSubstitutionPreview; // never set, never read
} | undefined { ... }
```

**After: return type matches actual output.**

```ts
export function completePendingExCommand(...): {
  command: string;
  cursor: number;
} | undefined { ... }
```

**Before: type requires property, runtime treats as optional.**

```ts
type ThemeColors = {
  promptBg: string; // required
  promptFg: string; // required
  statusBg: string; // required
};
// usage: theme.promptBg ?? DEFAULT_BG  // why require it if you fallback?
```

**After: type matches runtime reality.**

```ts
type ThemeColors = {
  promptBg?: string;
  promptFg?: string;
  statusBg?: string;
};
```

## Related

- `docs/solutions/ui-bugs/pi-vimmode-autocomplete-status-row-overlap-2026-06-15.md` — autocomplete row rendering boundary
- `docs/solutions/architecture-patterns/pi-vimmode-ex-command-line-substitution-architecture-2026-05-28.md` — Ex command-line scope boundaries
- `docs/solutions/design-patterns/pi-vimmode-read-only-help-overlay-ui-2026-06-09.md` — overlay/workbench row ownership
