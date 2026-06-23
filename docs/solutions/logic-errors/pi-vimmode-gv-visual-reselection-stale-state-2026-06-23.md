---
title: Pi vimmode gv visual reselection stale state
date: 2026-06-23
category: docs/solutions/logic-errors
module: pi-vimmode
problem_type: logic_error
component: tooling
symptoms:
  - "Vim `gv` did not consistently restore the previous visual selection"
  - "Visual `:` could exit through Ex command-line flow without preserving reselection history"
  - "Stale `gv` coordinates could reselect unrelated prompt text after a visual edit"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - testing_framework
  - modal-engine
  - visual-mode
tags:
  - pi-vimmode
  - gv
  - visual-mode
  - modal-engine
  - stale-state
  - typescript
---

# Pi vimmode gv visual reselection stale state

## Problem

`pi-vimmode` needed Vim-style `gv` reselection to restore the most recent visual selection after leaving visual mode. The first implementation path had two traps: not every visual exit captured the selection, and bounds-only validation could reselect unrelated text after prompt mutations.

## Symptoms

- `gv` after visual exit failed to restore the previous visual mode, anchor, and active cursor reliably.
- Characterwise, linewise, and blockwise visual selections needed different modes preserved, not just one generic visual state.
- Visual `:` entered Ex command-line flow without preserving enough state for a later `gv`.
- After deleting selected text, old coordinates could still be in bounds and point at different text.

## What Didn't Work

- Capturing only direct `Escape` exits missed other reselection-preserving exits: configured escape aliases, visual operators, yank/delete/change/replace/paste flows, block insert, and visual `:`.
- Checking only saved anchor/cursor bounds was not enough. After an edit, old coordinates can remain valid but no longer describe the same buffer snapshot.
- Exporting internal capture/validation helpers widened module API surface for no benefit. Only the cross-module entry points need to stay exported.

## Solution

Store reselection history in modal state with the source prompt text:

```ts
lastVisualSelection?: {
  mode: "visual" | "visualLine" | "visualBlock";
  anchor: Position;
  cursor: Position;
  text: string;
};
```

Capture the visual selection before exits that should support `gv` reselection:

```ts
function captureVisualSelection(state: ModalState, snapshot: EditorSnapshot): ModalState {
  if (!isVisualMode(state.mode) || !state.visualAnchor) return state;
  return {
    ...state,
    lastVisualSelection: {
      mode: state.mode,
      anchor: state.visualAnchor,
      cursor: snapshot.cursor,
      text: snapshot.text,
    },
  };
}

export function captureBeforeVisualExit(
  state: ModalState,
  snapshot: EditorSnapshot,
  update: ModalUpdate,
): ModalUpdate {
  if (!isVisualMode(state.mode)) return update;
  const captured = captureVisualSelection(state, snapshot);
  return {
    ...update,
    state: { ...update.state, lastVisualSelection: captured.lastVisualSelection },
  };
}
```

Use that wrapper in the engine for visual exits that route through top-level input handling:

```ts
if (matchesKey(data, "escape"))
  return captureBeforeVisualExit(state, snapshot, modeUpdate(state, "normal", options));

if (matchInsertEscapeInput(state, data, keymapForOptions(options).escape).kind === "matched")
  return captureBeforeVisualExit(state, snapshot, modeUpdate(state, "normal", options));

if (result.command === "startExCommand") {
  return captureBeforeVisualExit(state, snapshot, startVisualExCommandUpdate(state, snapshot));
}
```

Reject stale reselection by comparing the stored source text before restoring old coordinates, then validate anchor/cursor bounds:

```ts
function isValidVisualSelection(
  last: NonNullable<ModalState["lastVisualSelection"]>,
  snapshot: EditorSnapshot,
): boolean {
  if (last.text !== snapshot.text) return false;

  const { anchor, cursor } = last;
  const lineCount = snapshot.lines.length;
  if (anchor.line < 0 || anchor.line >= lineCount) return false;
  if (cursor.line < 0 || cursor.line >= lineCount) return false;

  const anchorLine = snapshot.lines[anchor.line] ?? "";
  const cursorLine = snapshot.lines[cursor.line] ?? "";
  if (anchor.col < 0 || anchor.col > anchorLine.length) return false;
  if (cursor.col < 0 || cursor.col > cursorLine.length) return false;

  return true;
}
```

`reselectVisualUpdate` can then restore the previous visual mode, anchor, and cursor from `gv` only when that validator passes.

Keep helper API tight: `isVisualMode`, `captureVisualSelection`, and `isValidVisualSelection` stay private; only `captureBeforeVisualExit` and `reselectVisualUpdate` cross module boundaries.

## Why This Works

`gv` depends on three pieces of durable state: the prior visual kind, the visual anchor, and the active cursor. Storing those in `ModalState.lastVisualSelection` decouples reselection from transient `visualAnchor`, which is cleared when visual mode exits.

Capturing at the visual-exit boundary fixes the root cause once instead of patching each command's resulting normal/insert-mode state by hand. The engine covers router-owned exits such as `Escape` and `:`, while visual helpers wrap operator/edit exits close to the selection logic.

The extra `text` field is a cheap stale-state guard. If prompt text changed, saved coordinates no longer refer to the same buffer snapshot, even when they still fit inside the new text. In that case `gv` no-ops rather than selecting unrelated content.

## Prevention

- Route any new visual-mode exit through `captureBeforeVisualExit` or capture the selection before constructing the exit update.
- Test visual commands at the modal state/effect boundary, not only by final text.
- Include stale-selection tests where old coordinates remain in bounds after an edit:

```ts
const deleted = applyModalKeys({ mode: "normal" }, "abcdef", p(0, 1), ["v", "l", "l", "d"]);
expect(deleted.text).toBe("aef");

const reselected = applyModalKeys(deleted.state, deleted.text, p(0, 1), ["g", "v"]);
expect(reselected.state.mode).toBe("normal");
expect(reselected.cursor).toEqual(p(0, 1));
```

- Cover one path per visual kind, visual `:`, at least one mutating visual command, configured `reselectVisual`, and a stale edit case.

## Related Issues

- [Visual commands swallowed by modal handler](./visual-line-paste-swallowed-by-modal-handler-2026-05-27.md) — same visual-mode routing risk, different command family.
- [Pi vimmode modal feature module extraction pattern](../architecture-patterns/pi-vimmode-modal-feature-module-extraction-pattern-2026-06-05.md) — background on keeping visual behavior in `src/modal/visual.ts` and engine routing in `src/modal/engine.ts`.
- [Pi vimmode finite Ex line commands architecture](../architecture-patterns/pi-vimmode-finite-ex-line-commands-architecture-2026-06-01.md) — related visual-source Ex behavior; active visual selection clears while reselection history can remain.
