---
title: Visual-line paste swallowed by modal handler
date: 2026-05-27
category: docs/solutions/logic-errors
module: pi-vimmode
problem_type: logic_error
component: tooling
symptoms:
  - "Visual-line mode ignored `p` instead of pasting the register"
  - "Editor stayed in visualLine mode after pressing `p`"
  - "Selected lines and register stayed unchanged"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - testing_framework
tags:
  - vim-mode
  - visual-line
  - paste
  - modal-engine
  - prompt-buffer
  - register-semantics
  - typescript
---

# Visual-line paste swallowed by modal handler

## Problem

`pi-vimmode` supported linewise yank/delete/change, but visual-line paste was missing. Pressing `p` after `V` selected a line did nothing, leaving users stuck in visual-line mode instead of replacing the selection with the register.

## Symptoms

- Select a line with `V`, then press `p`.
- Prompt text does not change.
- Mode remains `visualLine`.
- Register remains unchanged.

## What Didn't Work

- Relying on normal-mode `p` did not help because visual modes dispatch through `handleVisualInput()`, not `handleNormalInput()`.
- Reusing `pasteRegister()` directly would insert below or before the cursor, not replace the selected line range.
- Calling `deleteLineRange()` and then paste would overwrite the register with the deleted selection before the old register could be pasted.

## Solution

Add one prompt-buffer operation that atomically replaces the selected line range while using the old register as the paste source and returning the replaced text as the new register.

```ts
export function replaceLineRangeWithRegister(
  text: string,
  anchor: Position,
  active: Position,
  register: VimRegister | undefined,
): EditResult {
  const lines = splitText(text);
  const range = normalizeLineRange(lines, anchor, active);
  const selected = linewiseSelectionText(text, anchor, active);
  if (!register || register.text.length === 0) {
    return {
      text,
      cursor: { line: range.startLine, col: 0 },
      changed: false,
    };
  }

  const inserted = register.text.split("\n");
  let nextLines = [
    ...lines.slice(0, range.startLine),
    ...inserted,
    ...lines.slice(range.endLine + 1),
  ];
  if (nextLines.length === 0) nextLines = [""];

  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: { line: range.startLine, col: 0 },
    register: { type: "line", text: selected },
    changed: nextText !== text,
  };
}
```

Wire visual-line `p` explicitly in the modal handler.

```ts
case "p":
  if (linewise) return pasteVisualLineSelection(state, snapshot, options);
  return invalidate(state);
```

```ts
function pasteVisualLineSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  const result = replaceLineRangeWithRegister(
    snapshot.text,
    state.visualAnchor,
    snapshot.cursor,
    state.register,
  );
  return modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]);
}
```

Lock it with an integration regression test.

```ts
test("visual line paste replaces selected lines with the register", () => {
  const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
  editor.setText("one\ntwo\nthree");
  editor.handleInput("g");
  editor.handleInput("g");
  editor.handleInput("Y");

  editor.handleInput("G");
  editor.handleInput("V");
  editor.handleInput("p");

  expect(editor.getVimMode()).toBe("normal");
  expect(editor.getText()).toBe("one\ntwo\none");
  expect(editor.getRegister()).toEqual({ type: "line", text: "three" });
});
```

## Why This Works

Visual modes never fall through to normal-mode command handling. Each visual command must be routed by `handleVisualInput()` with mode-specific semantics.

The fix keeps linewise replacement as one buffer operation, so register ordering is correct: the paste source is read before the selected text becomes the new linewise register. `modeUpdate(..., "normal")` also guarantees paste exits visual-line mode like Vim.

## Prevention

- Add regression tests for mode-specific visual commands.
- Prefer pure buffer helpers when range and register must update atomically.
- When adding Vim commands, check all active dispatch tables; normal-mode support does not imply visual-mode support.
- Assert mode, text, cursor, and register in one integration test.

## Related Issues

- `docs/solutions/architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md` — explains why prompt-buffer operations should own register/range semantics.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — related modal parser and buffer-helper architecture.
- GitHub issue search for `pi-vimmode visual line paste` returned no related issues.
