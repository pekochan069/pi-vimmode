---
title: Configurable Insert-Mode Newline Keybindings for pi-vimmode
date: 2026-06-22
category: design-patterns
module: pi-vimmode
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - "Adding configurable insert-mode keybindings that must intercept input before Pi delegation"
  - "Extending the keymap system with a new named action group following existing validation patterns"
  - "Wiring buffer helpers into modal engine dispatch for stay-in-insert operations"
tags:
  - vimmode
  - keybindings
  - insert-mode
  - keymap
  - modal-engine
  - buffer-operations
---

# Configurable Insert-Mode Newline Keybindings for pi-vimmode

## Context

pi-vimmode users could not insert blank lines while staying in insert mode. All insert-mode input was delegated to Pi; there was no way to intercept a key chord, perform a buffer edit, and remain in insert mode. The existing `openLineBelow` (`o`) and `openLineAbove` (`O`) commands transitioned from normal mode into insert mode — they were unusable from insert mode itself.

The request: allow users to configure chords like `Ctrl+J` / `Ctrl+K` (or `Enter`, or other modified keys) that insert blank lines below/above the current line while staying in insert mode, matching behavior found in VS Code, Neovim, JetBrains, and other editors.

## Guidance

The implementation follows a three-layer pattern: **types → config → dispatch**. Each layer is isolated, testable, and follows existing conventions.

### 1. Types: user-facing vs resolved

Two interfaces keep the config parsing contract clean. `VimInsertKeymapOptions` accepts angle-bracket notation (e.g., `<C-j>`); `ResolvedVimInsertKeymap` always contains normalized plain-key identifiers (e.g., `"ctrl+j"`).

```typescript
// src/types.ts — VimInsertKeymapOptions (user-facing, angle-bracket OK)
export type VimInsertKeymapOptions = {
  openLineBelow?: readonly string[];
  openLineAbove?: readonly string[];
};

// ResolvedVimInsertKeymap (always plain-key identifiers)
export type ResolvedVimInsertKeymap = {
  openLineBelow: readonly string[];
  openLineAbove: readonly string[];
};

// Added to VimKeymapOptions:
export interface VimKeymapOptions {
  // ... existing fields ...
  insert?: VimInsertKeymapOptions;
}

// Added to ResolvedVimKeymap:
export interface ResolvedVimKeymap {
  // ... existing fields ...
  insert: ResolvedVimInsertKeymap;
}
```

### 2. Keymap descriptors: register the namespace

Descriptors define the defaults and validation metadata. Empty defaults (`[]`) ensure opt-in — no breaking change for existing users.

```typescript
// src/keymap-descriptors.ts
export const KEYMAP_INSERT_DESCRIPTORS = {
  openLineBelow: { defaults: [] },
  openLineAbove: { defaults: [] },
} as const satisfies Record<string, KeymapDescriptor>;
```

**Important**: `openLineBelow`/`openLineAbove` are registered in _two_ descriptor groups with different defaults:

- `KEYMAP_INSERT_DESCRIPTORS` — defaults `[]`, dispatch in insert mode only
- `KEYMAP_COMMAND_DESCRIPTORS` — defaults `["o"]`/`["O"]`, dispatch in normal/visual mode only

This is by design. The same semantic action (`openLineBelow`) operates differently depending on the current mode.

### 3. Config parsing: `parseInsertBindings`

The parser lives alongside `parseInsertEscapeArray` in `src/config.ts`. Key behaviors:

- Validates the value is an object
- Rejects unknown action names (only `openLineBelow`/`openLineAbove` allowed)
- Validates key strings through `parseStringArray` (angle-bracket → plain-key normalization, duplicate detection)
- Filters out printable text sequences — single letters/digits like `"j"` or `"oo"` are rejected with a warning
- Supports the same `allowProtectedKey` callback as other keymap groups (for `allowProtectedOverrides`)

```typescript
const INSERT_ACTION_SET = new Set<string>(["openLineBelow", "openLineAbove"]);

function parseInsertBindings(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
  options: { allowProtectedKey?: (key: string) => boolean } = {},
): Partial<ResolvedVimInsertKeymap> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.keymap.insert must be an object`);
    return undefined;
  }

  const parsed: Partial<ResolvedVimInsertKeymap> = {};
  for (const [action, bindings] of Object.entries(value)) {
    if (!INSERT_ACTION_SET.has(action)) {
      warnings.push(`${sourceLabel}: unsupported piVimMode.keymap.insert.${action}`);
      continue;
    }
    const label = `${sourceLabel}: piVimMode.keymap.insert.${action}`;
    const keys = parseStringArray(bindings, label, warnings, {
      allowProtectedKey: options.allowProtectedKey,
    });
    if (!keys) continue;
    const filtered = keys.filter((sequence) => {
      if (!isPrintableTextSequence(sequence)) return true;
      warnings.push(`${label} contains unsupported printable text sequence ${sequence}`);
      return false;
    });
    if (filtered.length > 0) parsed[action as keyof ResolvedVimInsertKeymap] = filtered;
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}
```

Integration into `parseKeymap`:

```typescript
partial.insert = parseInsertBindings(value.insert, sourceLabel, warnings, {
  allowProtectedKey,
});
```

#### `isPrintableTextSequence` fix

The existing `isPrintableTextSequence` function only checked for the absence of `"+"` (modifier). During this work, it was improved to also reject known non-printable key names (`enter`, `tab`, `escape`, `backspace`, `space`, etc.) using a `NON_PRINTABLE_KEY_NAMES` set. Without this fix, a config like `openLineBelow: ["enter"]` would pass the printable-text filter and reach the protected-key check only if `allowProtectedOverrides` was set — but `"enter"` was never printable text. The fix makes the filter correct for both escape alias validation and insert binding validation.

### 4. Merge, clone, and defaults

Three plumbing functions needed the `insert` field:

```typescript
// DEFAULT_VIM_KEYMAP
insert: Object.freeze({
  openLineBelow: Object.freeze([]),
  openLineAbove: Object.freeze([]),
}),

// cloneKeymap — deep-copy arrays (defaults are frozen)
insert: {
  openLineBelow: [...keymap.insert.openLineBelow],
  openLineAbove: [...keymap.insert.openLineAbove],
},

// mergeKeymap — partial onto resolved
if (partial.insert) {
  target.insert = { ...target.insert, ...partial.insert };
}

// mergeKeymapOverlay — same spread pattern across config layers
```

### 5. Modal dispatch: intercept before Pi delegation

In `handleInsertInput` (`src/modal/engine.ts`), the dispatch order is:

1. Block insert check → `handleBlockInsertInput`
2. Physical escape → normal mode
3. Autocomplete open → delegate to Pi
4. Escape alias matching → normal mode (pending/matched/mismatched states)
5. **Insert keymap dispatch** (new) — this feature
6. Default `delegate(state, data)` → Pi

Step 5 implementation:

```typescript
const key = keySequence(data);
if (key) {
  const insert = keymapForOptions(options).insert;
  if (insert.openLineBelow.includes(key)) {
    const result = openLineBelow(snapshot.text, snapshot.cursor);
    return withEffects(editState(state, result), [
      { type: "edit", result },
      { type: "invalidate" },
    ]);
  }
  if (insert.openLineAbove.includes(key)) {
    const result = openLineAbove(snapshot.text, snapshot.cursor);
    return withEffects(editState(state, result), [
      { type: "edit", result },
      { type: "invalidate" },
    ]);
  }
}
```

The key matching uses `keySequence(data)` which calls `parseKey` from pi-tui to normalize the raw terminal input to a key identifier string (e.g., `"\u001b[106;5u"` → `"ctrl+j"`).

Insert bindings placed _after_ autocomplete check and escape alias matching, but _before_ default delegation. This ordering is critical:

- Escape aliases must win (user configured `<C-j>` as escape → escape always wins)
- Autocomplete-open input must still delegate to Pi even if the key matches an insert binding
- Insert dispatch fires before search highlight clearing, so `editState` clears highlights naturally

### 6. Buffer helpers: `openLineBelow` / `openLineAbove`

These already existed in `src/buffer.ts` and were reused without modification:

```typescript
export function openLineBelow(text: string, cursor: Position): EditResult {
  if (text.length === 0) return { text, cursor: { line: 0, col: 0 }, changed: false };
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const nextLines = [...lines.slice(0, pos.line + 1), "", ...lines.slice(pos.line + 1)];
  return {
    text: joinLines(nextLines),
    cursor: { line: pos.line + 1, col: 0 },
    changed: true,
  };
}

export function openLineAbove(text: string, cursor: Position): EditResult {
  if (text.length === 0) return { text, cursor: { line: 0, col: 0 }, changed: false };
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const nextLines = [...lines.slice(0, pos.line), "", ...lines.slice(pos.line)];
  return {
    text: joinLines(nextLines),
    cursor: { line: pos.line, col: 0 },
    changed: true,
  };
}
```

Both return `changed: false` for empty buffers. The modal dispatch handles this gracefully: `editState` runs `clearSearchHighlight` only when `result.changed` is true, and the edit effect is emitted regardless.

### 7. No state side effects

Insert-mode line opening does **not** modify:

- **Registers**: No register write — unlike normal-mode `d`/`y`/`c` operations
- **Marks**: No mark update — unlike normal-mode `m` commands
- **Visual state**: No visual mode interaction — unlike visual-mode operations
- **Macro slots**: No macro recording or replay — unlike `.` repeat
- **Dot-repeat**: No dot-repeat state — unlike normal-mode edits

The `editState` call handles search highlight clearing (when `changed: true`) but writes no register state because `EditResult` from the buffer helpers has no `register` property.

## Why This Matters

1. **Insert-mode par with other editors**: Users can now insert blank lines while staying in insert mode, matching VS Code's `editor.action.insertLineAfter`, Neovim's `inoremap`, and JetBrains' Ctrl+Enter behavior.

2. **Follows the established pattern**: Types → descriptors → parse → merge → dispatch is the same pipeline used by normal-mode commands, motion aliases, and escape aliases. Adding to it required no new architectural patterns — just extending the existing one.

3. **Safety by default**: The printable-text filter (single letters rejected) and protected-key validation (enter/tab/escape blocked unless allow-listed) ensure users cannot accidentally break insert-mode typing. Every guardrail that protects normal-mode bindings applies equally.

4. **`isPrintableTextSequence` fix uncovered**: The function now correctly rejects named non-printable keys (`"enter"`, `"tab"`, `"escape"` etc.) in addition to checking for modifier prefixes. This makes it correct for both escape alias validation and insert binding validation. Previously, a key like `"enter"` would pass the printable-text check because it has no `"+"` sign, only to be caught by the downstream protected-key check. Now the filter is self-consistent.

5. **Pattern for future insert bindings**: Any future insert-mode keybinding (autocomplete accept, snippet expand, tab navigation) follows this exact architecture: add to types → add descriptor → wire in `handleInsertInput` → test.

## When to Apply

- Adding any new insert-mode keybinding that must perform a pi-vimmode operation and remain in insert mode (not delegate to Pi).
- Extending the keymap system with a new named action group. Follow the same `KEYMAP_*_DESCRIPTORS` + `parse*Bindings` + `mergeKeymap` pattern.
- Implementing similar "stay-in-mode" operations for custom modal modes (same dispatch architecture with different `handle*Input` functions).
- Avoid this pattern for operations that should delegate to Pi (text input, autocomplete navigation, undo/redo).

## Examples

### User config: Ctrl+J / Ctrl+K for line opening

```json
{
  "piVimMode": {
    "keymap": {
      "insert": {
        "openLineBelow": ["ctrl+j"],
        "openLineAbove": ["ctrl+k"]
      }
    }
  }
}
```

### User config: Enter to open line below (with allow-list)

```json
{
  "piVimMode": {
    "keymap": {
      "insert": {
        "openLineBelow": ["enter"]
      },
      "allowProtectedOverrides": ["enter"]
    }
  }
}
```

### User config: Ctrl+Shift+O for both actions via Kitty protocol

```json
{
  "piVimMode": {
    "keymap": {
      "insert": {
        "openLineBelow": ["ctrl+o"],
        "openLineAbove": ["ctrl+shift+o"]
      }
    }
  }
}
```

**Note**: `Ctrl+Shift+O` requires a Kitty-compatible terminal that sends distinct escape sequences. Legacy terminals send the same byte for Ctrl+O and Ctrl+Shift+O. Use `<C-S-o>` (not `<C-O>`) in angle-bracket notation — our normalizer lowercases the key.

### Config test: printable text rejection

```typescript
// test/config.test.ts
test("rejects raw printable text in insert bindings", () => {
  const result = resolveVimOptions({
    piVimMode: {
      keymap: { insert: { openLineBelow: ["j"] } },
    },
  });
  expect(result.options.keymap?.insert.openLineBelow).toEqual([]);
  expect(result.warnings).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        "insert.openLineBelow contains unsupported printable text sequence j",
      ),
    ]),
  );
});
```

### Modal test: configured open-line-below

```typescript
// test/modal.test.ts
const insertOptions = resolveVimOptions({
  piVimMode: {
    keymap: { insert: { openLineBelow: ["ctrl+j"], openLineAbove: ["ctrl+k"] } },
  },
}).options;

test("configured insert open-line-below opens line and stays in insert", () => {
  const ctrlJ = "\u001b[106;5u";
  const result = handleModalInput({ mode: "insert" }, snapshot, insertOptions, ctrlJ);
  expect(result.state.mode).toBe("insert");
  expect(result.effects.some((e) => e.type === "edit")).toBe(true);
});
```

### Fast-path test: newline keys take modal path

```typescript
// test/modal.test.ts
test("canFastDelegateInsertInput keeps configured insert newline keys on modal path", () => {
  expect(canFastDelegateInsertInput({ mode: "insert" }, "\u001b[106;5u")).toBe(false);
  expect(canFastDelegateInsertInput({ mode: "insert" }, "\x0a")).toBe(false);
  expect(canFastDelegateInsertInput({ mode: "insert" }, "a")).toBe(true);
});
```

## What Didn't Work (rejected approaches)

| Approach                                                   | Why Rejected                                                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Reusing `commands.openLineBelow` in insert mode            | Normal-mode commands would unexpectedly steal insert text, and the routing would imply many insert commands exist |
| Broad `insertCommands` keymap with multiple operations     | Overbuilt for the ask; only needed previous/next line opening                                                     |
| Arbitrary multi-key insert sequences (e.g., `"jj"`)        | Needs input buffering/timeout semantics; risks swallowing typed text                                              |
| Default non-empty insert bindings                          | Breaking change — every insert-mode key currently delegates to Pi                                                 |
| Delegating `Enter`/terminal newline to Pi for line opening | Pi owns submit/reset behavior; cursor placement would differ from `o`/`O`                                         |

## Related

### Direct source files

- `src/types.ts` — `VimInsertKeymapOptions` and `ResolvedVimInsertKeymap` type definitions
- `src/keymap-descriptors.ts` — `KEYMAP_INSERT_DESCRIPTORS` registration
- `src/config.ts` — `parseInsertBindings`, `INSERT_ACTION_SET`, clone/merge/overlay handling
- `src/config.ts` — `isPrintableTextSequence` and `NON_PRINTABLE_KEY_NAMES` fix
- `src/buffer.ts` (lines 2152–2174) — `openLineBelow`/`openLineAbove` buffer helpers
- `src/modal/engine.ts` (lines 224–242) — Insert newline dispatch in `handleInsertInput`
- `src/modal/normal.ts` (lines 406–416) — Normal-mode `openLineBelow`/`openLineAbove` dispatch (for comparison)
- `docs/settings.md` — Insert mode newline bindings documentation section
- `docs/features.md` — Insert-mode newline behavior paragraph

### Related docs in this project

- `docs/solutions/developer-experience/pi-vimmode-ctrl-p-insert-mode-delegates-to-pi-2026-06-22.md` — Core reference for how insert mode routes keys, same dispatch order
- `docs/solutions/developer-experience/pi-vimmode-ctrl-d-ctrl-u-half-page-scroll-2026-06-18.md` — Mode-aware control-key ownership pattern
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — Buffer helper architecture and `openLineBelow`/`openLineAbove` implementation
- `docs/solutions/design-patterns/pi-vimmode-actionable-keybinding-catalog-2026-06-10.md` — Mode ownership in keybinding catalog
- `docs/solutions/logic-errors/pi-vimmode-config-keymap-precedence-2026-05-26.md` — Keymap precedence with same action names in different groups
- `docs/solutions/architecture-patterns/pi-vimmode-typed-action-registry-keybindings-2026-06-09.md` — Semantic action registry for keybindings

### Tests

- `test/config.test.ts` — 9 config tests for insert bindings
- `test/modal.test.ts` — 8 modal tests for insert newline dispatch
- `test/buffer.test.ts` — Buffer tests for `openLineBelow`/`openLineAbove`
