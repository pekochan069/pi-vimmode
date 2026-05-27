---
title: Visual block insert preview hidden during editing
date: 2026-05-27
category: docs/solutions/ui-bugs
module: pi-vimmode
problem_type: ui_bug
component: tooling
symptoms:
  - "Visual Block `I`/`A` accepted typed text but did not show it while editing"
  - "Inserted text appeared only after pressing `Esc`"
  - "The editor rendered the original buffer during the block insert session"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - testing_framework
tags:
  - visual-block
  - vim-mode
  - insert-preview
  - modal-state
  - custom-editor
  - typescript
---

# Visual block insert preview hidden during editing

## Problem

Visual Block `I`/`A` insert accepted typed characters, but users could not see what they were typing. The collected text appeared only after `Esc`, so insert mode looked broken even though the final block edit could still apply.

## Symptoms

- Press `Ctrl-v`, select a block, then press `I` or `A`.
- Type printable characters.
- Prompt text does not change while typing.
- Press `Esc`; the block insertion appears across selected lines.

## What Didn't Work

- Keeping typed text only in `ModalState.blockInsert.text` and invalidating render.

```ts
return invalidate({
  ...state,
  blockInsert: { ...state.blockInsert, text: state.blockInsert.text + key },
});
```

This re-rendered the `CustomEditor` buffer, but the buffer had not changed. The renderer did not know how to display side-channel block-insert text from modal state.

- Applying all selected-line insertion only on `Esc`.

That produced the final edit, but it gave no live feedback. For an insert-like mode, at least one line must behave like normal insert mode while the session is active.

## Solution

Use one selected line as the live preview line. Delegate printable input and backspace to the underlying editor for that line, while the modal state records the same text for the eventual block edit.

### Track preview line and restore cursor before typing

`startBlockInsert()` records `previewLine`, calculates the insert column from the visual block, and asks the adapter to move the cursor there before entering insert behavior.

```ts
const previewLine = Math.min(state.visualAnchor.line, snapshot.cursor.line);
const startCol = Math.min(state.visualAnchor.col, snapshot.cursor.col);
const endCol = Math.max(state.visualAnchor.col, snapshot.cursor.col);
const previewCol = placement === "start" ? startCol : endCol + 1;

return withEffects(
  {
    mode: "insert",
    register: state.register,
    blockInsert: {
      anchor: state.visualAnchor,
      active: snapshot.cursor,
      placement,
      previewLine,
      text: "",
    },
  },
  [
    { type: "restoreCursor", position: { line: previewLine, col: previewCol } },
    { type: "terminalCursor", style: options.cursor.insert },
    { type: "invalidate" },
  ],
);
```

### Delegate visible input to the editor

Printable input updates modal state and delegates the same byte to `CustomEditor`, so the preview line changes immediately.

```ts
const key = keySequence(data);
if (!key || key.length !== 1) return invalidate(state);

return withEffects(
  {
    ...state,
    blockInsert: { ...state.blockInsert, text: state.blockInsert.text + key },
  },
  [{ type: "delegate", input: data }, { type: "invalidate" }],
);
```

Backspace mirrors the same rule: update collected text, then delegate backspace so the preview line stays accurate.

```ts
if (matchesKey(data, "backspace")) {
  if (state.blockInsert.text.length === 0) return invalidate(state);

  return withEffects(
    {
      ...state,
      blockInsert: { ...state.blockInsert, text: state.blockInsert.text.slice(0, -1) },
    },
    [{ type: "delegate", input: data }, { type: "invalidate" }],
  );
}
```

### Skip the preview line during final block application

On `Esc`, apply the collected text to the rest of the visual block, but skip the line that already received delegated editor input.

```ts
const result = insertBlockText(
  snapshot.text,
  state.blockInsert.anchor,
  state.blockInsert.active,
  state.blockInsert.text,
  state.blockInsert.placement,
  state.blockInsert.previewLine,
);
```

`insertBlockText()` owns the block-range math and optional skipped line.

```ts
for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
  if (lineIndex === skipLine) continue;
  const line = nextLines[lineIndex] ?? "";
  const insertCol = Math.min(col, line.length);
  nextLines[lineIndex] = line.slice(0, insertCol) + insertText + line.slice(insertCol);
}
```

## Why This Works

`CustomEditor` already renders normal insert-mode edits. Delegating input lets the editor mutate and display the preview line immediately instead of requiring a custom renderer for in-progress block-insert text.

The modal layer still owns Vim semantics: it remembers the block anchor, active cursor, placement, preview line, and collected text. On `Esc`, the buffer helper applies the same text to every selected line except the preview line, preventing duplicate insertion.

This relies on the adapter taking a fresh editor snapshot after delegated preview input, so the `Esc` edit sees the preview-line mutation before applying the remaining block lines.

## Prevention

- Insert-like modal flows should delegate visible text input to the editor unless rendering explicitly handles the in-progress text.
- If one selected line is used as live preview, final multi-line application must skip that preview line.
- Add both state-machine and integration tests for visual commands:
  - `test/modal.test.ts` should assert `restoreCursor`, `delegate`, and final edit effects.
  - `test/vim-editor.test.ts` should assert text appears immediately after typing in Visual Block insert.
  - `test/buffer.test.ts` should cover start/end column block insertion.
- When adding a visual-mode command, verify mode, text, cursor, register, and live rendering behavior where applicable.

## Related Issues

- [Visual-line paste swallowed by modal handler](../logic-errors/visual-line-paste-swallowed-by-modal-handler-2026-05-27.md) — related visual-mode command routing bug.
- [Finite Vim keybinding parser with pure buffer helpers](../architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md) — adapter boundary and modal-engine architecture used by this fix.
- [Prompt buffer operation API for Vim editor adapters](../architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md) — rationale for keeping rectangular insertion as a buffer operation.
- GitHub issue search for `pi-vimmode visual block insert`, `pi-vimmode visual block`, and `CustomEditor Vim editor delegate` returned no related issues.
