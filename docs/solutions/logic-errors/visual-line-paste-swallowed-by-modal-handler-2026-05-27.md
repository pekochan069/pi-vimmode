---
title: Visual commands swallowed by modal handler
date: 2026-05-27
last_updated: 2026-06-04
category: docs/solutions/logic-errors
module: pi-vimmode
problem_type: logic_error
component: tooling
symptoms:
  - "Visual-line mode ignored `p` instead of pasting the register"
  - "Visual mode `r{char}` created pending state but did not replace selected text"
  - "Visual command input was invalidated instead of producing an edit effect"
  - "Visual mode `2>` indented selected lines by one level instead of two"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - testing_framework
  - documentation
tags:
  - vim-mode
  - visual-mode
  - modal-engine
  - prompt-buffer
  - shift-operators
  - counts
  - register-semantics
  - char-command
  - typescript
---

# Visual commands swallowed by modal handler

## Problem

`pi-vimmode` visual modes route input through `handleVisualInput()`, not the normal-mode command path. Commands that worked in normal mode could still be swallowed in visual mode unless visual routing explicitly handled their parser result and selection semantics.

Three concrete failures exposed this pattern:

- Visual-line `p` did nothing instead of replacing the selected lines with the register.
- Visual `r{char}` entered pending replacement state, then ignored the typed replacement character instead of replacing the selected text.
- Visual `2>` indented the selected lines by one level instead of treating the count as shift depth.

## Symptoms

- Select a line with `V`, then press `p`: prompt text does not change, mode remains `visualLine`, register remains unchanged.
- Select text with `v` or `Ctrl-v`, press `r`, then type a replacement character: selected text is not replaced.
- Normal-mode `p`, `r{char}`, or counted shift commands may work, creating false confidence that the command is implemented everywhere.
- In visual modes, the selected lines change but count metadata can still be lost; `2>` becomes indistinguishable from `>`.

## What Didn't Work

- Relying on normal-mode command handling did not help because visual modes dispatch through `handleVisualInput()`, not `handleNormalInput()`.
- Reusing `pasteRegister()` directly for visual-line paste would insert below or before the cursor, not replace the selected line range.
- Calling `deleteLineRange()` and then paste would overwrite the register with the deleted selection before the old register could be pasted.
- Adding normal-mode `replaceChar` support did not make visual `r{char}` work because visual input only handled `motion`, `command`, `pending`, and `invalid` parser results. It did not consume the second-stage `charCommand` result from `r` plus the typed replacement character.
- Reusing normal shift count semantics directly would have been wrong: normal `2>>` means two lines by one level, while visual `2>` means selected lines by two levels because the selection already defines the line range.
- Resolving the visual shift operator from `operatorActionForSequence(result.pending, keymap)` alone found `>`/`<`, but discarded the count encoded in the pending sequence.

## Solution

Treat each visual command as a mode-specific operation. Parse keys with the shared finite parser, then explicitly route the resolved result in `handleVisualInput()` and delegate selection math/register updates to prompt-buffer helpers.

### Visual-line paste

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

Wire visual-line `p` explicitly in the visual handler.

```ts
if (result.command === "pasteAfter") {
  if (state.mode === "visualLine") return pasteVisualLineSelection(state, snapshot, options);
  return invalidate(state.pendingRegister ? clearPending(state) : state);
}
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
    registerToRead(state),
  );
  return modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]);
}
```

### Visual counted shift

For visual shift operators, preserve the count prefix and pass it as shift depth. The normal-mode path keeps using count as the number of addressed lines.

Before, visual pending operators resolved the operator but lost count metadata:

```ts
if (result.type === "pending") {
  const operator = operatorActionForSequence(result.pending, keymap);
  if (operator)
    return applyVisualOperator(state, snapshot, options, visualKindForMode(state.mode), operator);
}
```

After, the visual handler extracts count from the pending sequence and threads it into the visual operation:

```ts
if (result.type === "pending") {
  const operator = operatorActionForSequence(result.pending, keymap);
  if (operator)
    return applyVisualOperator(
      state,
      snapshot,
      options,
      visualKindForMode(state.mode),
      operator,
      countForPendingSequence(result.pending),
    );
}
```

Then the visual shift helper maps count to repeated line transforms over the selected/touched lines and narrows the `ExLineEditResult` before emitting an edit:

```ts
const shiftResult = shiftLineRange(
  snapshot.text,
  visualLineRange(state.visualAnchor, snapshot.cursor),
  action,
  snapshot.cursor,
  depth,
);
if (!shiftResult.ok) return modeUpdate(state, "normal", options);
const result = shiftResult.edit;
return modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]);
```

Keep the buffer helper responsible for exact transform semantics by applying the existing `:indent` / `:dedent` logic once per depth level:

```ts
for (let i = 0; i < Math.max(1, depth); i += 1) {
  currentResult = applyPromptTransform(currentText, range, { action }, originalCursor);
  if (!currentResult.ok) return currentResult;
  currentText = currentResult.edit.text;
}
```

Regression-test visual count depth so it cannot drift again:

```ts
const countedVisual = applyModalKeys(
  { mode: "visualLine", visualAnchor: p(0, 0) },
  "one\ntwo",
  p(1, 0),
  ["2", ">"],
);
expect(countedVisual.text).toBe("    one\n    two");
```

### Visual replacement

Add a prompt-buffer helper for `r{char}` across charwise, linewise, and blockwise selections. Contract: replace selected cells in place, keep line breaks for charwise selections, and return replaced text as the register.

Examples:

```ts
replaceVisualRangeChars("abc\ndef", p(0, 1), p(1, 1), "char", "X");
// text: "aXX\nXXf"
// register: { type: "char", text: "bc\nde" }

replaceVisualRangeChars("abcd\nef", p(0, 1), p(1, 2), "block", "Q");
// text: "aQQd\neQ"
// register: { type: "char", text: "bc\nf" }
```

Handle the parser's second-stage char-command result in visual mode.

```ts
if (result.type === "charCommand") {
  if (state.pendingRegister || result.command !== "replaceChar") {
    return invalidate(clearPending(state));
  }

  return replaceVisualSelection(
    state,
    snapshot,
    options,
    visualKindForMode(state.mode),
    result.char,
  );
}
```

```ts
function replaceVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: "char" | "line" | "block",
  char: string,
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  const result = replaceVisualRangeChars(
    snapshot.text,
    state.visualAnchor,
    snapshot.cursor,
    kind,
    char,
  );
  return modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]);
}
```

Lock both paths with regression tests at the buffer and modal seams.

```ts
test("visual replace changes selected text with a typed character", () => {
  const pending = handleModalInput(
    { mode: "visual", visualAnchor: { line: 0, col: 1 } },
    { text: "abc", lines: ["abc"], cursor: { line: 0, col: 2 } },
    options,
    "r",
  );

  const replaced = handleModalInput(
    pending.state,
    { text: "abc", lines: ["abc"], cursor: { line: 0, col: 2 } },
    options,
    "X",
  );

  expect(replaced.state.mode).toBe("normal");
  expect(replaced.effects[0]).toEqual({
    type: "edit",
    result: {
      text: "aXX",
      cursor: { line: 0, col: 1 },
      register: { type: "char", text: "bc" },
      changed: true,
    },
  });
});
```

## Why This Works

Visual modes never fall through to normal-mode command handling. Each visual command must be routed by `handleVisualInput()` with mode-specific semantics.

The fixes keep range and register behavior in prompt-buffer operations:

- Visual-line paste reads the old register before selected text becomes the new linewise register.
- Visual replacement applies char/line/block range math in one helper and returns the replaced selection as the register.
- Visual shift uses the visual selection for range and the pending count for shift depth, so `2>` and `>` remain distinct without changing normal `2>>` semantics.

The modal engine only owns parser-result routing, mode transition, and edit effects:

```text
VISUAL_LINE + p -> replace selected lines -> NORMAL
VISUAL + r + X -> replace selected chars -> NORMAL
VISUAL_BLOCK + r + X -> replace selected cells -> NORMAL
VISUAL_LINE + 2 > -> shift selected lines by two levels -> NORMAL
```

## Prevention

- Add regression tests for mode-specific visual commands.
- Prefer pure buffer helpers when range and register must update atomically.
- When adding Vim commands, check all active dispatch tables; normal-mode support does not imply visual-mode support.
- Audit every `SemanticCommandResult` union member in modal handlers. New result types such as `charCommand` should not silently fall through.
- Test multi-step visual commands explicitly: first key creates pending state, second key executes edit.
- Test count-bearing visual operators alongside their normal-mode counterparts when counts mean different things.
- Assert mode, text, cursor, and register in one integration test.

Verification used for the visual replacement and counted-shift fixes:

```bash
bun test test/buffer.test.ts test/modal.test.ts
bun run check-types
bun run lint
bun run format:check
openspec validate add-shift-operators --type change --strict
```

## Related Issues

- `docs/solutions/architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md` — explains why prompt-buffer operations should own register/range semantics.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — related modal parser and buffer-helper architecture.
- `docs/solutions/ui-bugs/visual-block-insert-preview-hidden-2026-05-27.md` — related visual-block command handling.
- `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md` — related count/command-contract drift prevention.
- GitHub issue searches for `pi-vimmode visual line paste`, `visual r pi-vimmode replace`, and `visual shift count 2> indent` returned no related issues.
