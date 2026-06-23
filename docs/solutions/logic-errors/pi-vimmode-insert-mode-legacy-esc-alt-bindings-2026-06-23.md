---
title: Insert-Mode Alt Bindings Need Legacy ESC Decoding
date: 2026-06-23
category: logic-errors
module: pi-vimmode
problem_type: logic_error
component: tooling
symptoms:
  - "Configured insert-mode alt+d did not run deleteWordForward"
  - "Configured insert-mode alt+f did not run moveWordForward"
  - "Legacy terminals sent ESC+d and ESC+f instead of CSI-u Alt events"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags:
  - insert-mode
  - keybindings
  - terminal-escape-sequences
  - alt-key
---

# Insert-Mode Alt Bindings Need Legacy ESC Decoding

## Problem

`piVimMode.keymap.insert` gained configurable edit and movement bindings, but user-configured `alt+d` and `alt+f` did not work reliably in insert mode. Some terminals send Alt chords as legacy `ESC`-prefixed printable bytes (`ESC+d`, `ESC+f`) instead of CSI-u modified key events.

## Symptoms

- `deleteWordForward: ["alt+d"]` behaved like a single-character edit or did not dispatch as the configured action.
- `moveWordForward: ["alt+f"]` did not move to the next word.
- CSI-u forms like `\u001b[100;3u` and legacy forms like `\u001bd` needed to resolve to the same key name.

## What Didn't Work

- Treating insert-mode input with the generic `keySequence()` path was too broad. It let generic parser behavior interpret `ESC` sequences before the insert keymap could see `alt+d` / `alt+f`.
- Adding config keys alone was insufficient. `piVimMode.keymap.insert` also needed runtime dispatch and buffer helpers for each edit/movement action.
- Prior session history suggested adding the insert-scoped action names (`deleteWordForward`, `moveWordForward`) but did not address legacy terminal Alt decoding. (session history)

## Solution

Add an insert-specific key decoder that recognizes legacy `ESC` + printable input as a literal Alt chord, and use it only from insert-mode dispatch.

```ts
function legacyAltPrintable(data: string): string | undefined {
  if (data.length !== 2 || data.charCodeAt(0) !== 0x1b) return undefined;
  const char = data[1];
  return char && char.charCodeAt(0) >= 32 ? `alt+${char}` : undefined;
}

export function insertKeySequence(data: string): string | undefined {
  return (
    decodeKittyPrintable(data) ??
    (data.length === 1 && data.charCodeAt(0) >= 32 ? data : undefined) ??
    legacyAltPrintable(data) ??
    parseKey(data)
  );
}
```

Then use that decoder from insert mode instead of the normal-mode decoder:

```ts
const key = insertKeySequence(data);
if (key) {
  const insert = keymapForOptions(options).insert;

  if (insert.deleteWordForward.includes(key)) {
    const result = insertDeleteWordForward(snapshot.text, snapshot.cursor);
    return withEffects(editState(state, result), [
      { type: "edit", result },
      { type: "invalidate" },
    ]);
  }

  if (insert.moveWordForward.includes(key)) {
    const position = insertWordForwardPosition(snapshot.text, snapshot.cursor);
    return withEffects(state, [{ type: "restoreCursor", position }, { type: "invalidate" }]);
  }
}

return delegate(state, data);
```

The full fix also added insert-mode helpers for word/line movement and deletion, expanded the insert keymap action allow-list, updated descriptors/types/docs, and covered both terminal encodings in tests:

```ts
const altD = "\u001bd";
const csiAltD = "\u001b[100;3u";
const altF = "\u001bf";
const csiAltF = "\u001b[102;3u";
```

## Why This Works

Insert mode has different ownership rules from normal mode: most text should delegate to Pi, but explicitly configured insert actions must intercept before delegation. `insertKeySequence()` keeps that scope tight:

1. Kitty printable decoding still wins first.
2. Plain printable text still stays insert text.
3. Legacy `ESC` + printable bytes become normalized `alt+<char>` bindings.
4. Generic `parseKey()` remains the fallback for CSI-u and other named keys.

Keeping legacy Alt decoding insert-scoped avoids changing normal-mode command parsing or Ex command-line behavior.

## Prevention

- When adding insert-mode bindings, test both legacy Alt (`ESC+d`) and CSI-u (`ESC[100;3u`) forms.
- Keep config parsing tests separate from runtime input dispatch tests; accepting a binding does not prove terminal input reaches it.
- Route insert-only ownership through `insertKeySequence()` rather than broadening normal-mode `keySequence()`.
- Add a regression test for each new dispatch path and terminal encoding; assert register behavior only for actions that can write registers.

## Related Issues

- `docs/solutions/design-patterns/pi-vimmode-configurable-insert-mode-newline-keybindings-2026-06-22.md` — predecessor pattern for configurable insert-mode dispatch.
- `docs/solutions/developer-experience/pi-vimmode-ctrl-p-insert-mode-delegates-to-pi-2026-06-22.md` — explains insert-mode delegation boundaries.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — base parser/buffer/modal separation pattern.
