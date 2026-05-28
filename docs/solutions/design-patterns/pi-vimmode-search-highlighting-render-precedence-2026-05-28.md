---
title: Pi Vim mode search highlighting render precedence
date: 2026-05-28
category: docs/solutions/design-patterns
module: pi-vimmode
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - "Adding prompt-local UI state that must compose with cursor and visual selection rendering"
  - "Adding configurable `piVimMode` options that must survive live editor construction"
  - "Implementing search UI for `/`, `n`, or `N` in the modal editor"
related_components:
  - "OpenSpec"
  - "modal-engine"
  - "renderer"
  - "configuration"
tags: [pi-vimmode, search-highlighting, render-precedence, configuration, modal-state, openspec]
---

# Pi Vim mode search highlighting render precedence

## Context

`pi-vimmode` added configurable prompt search highlighting in OpenSpec change `add-search-highlighting-options`. The feature needed to show literal `/`, `n`, and `N` matches without changing search motion semantics, breaking terminal width safety, or hiding visual selections and cursor styling.

The final implementation spans config parsing, modal state, prompt-buffer range helpers, ANSI rendering, live editor option routing, docs, and tests. Verification passed with `bun run check-types`, `bun test` (185 tests), and `openspec validate --specs --strict` (11 specs).

## Guidance

Model search highlighting as render-only UI state layered on top of existing search behavior.

### Keep command state separate from highlight state

`lastSearch` should continue to drive repeat behavior. `searchHighlight` should only drive visible rendering. Clearing highlights on cancel or insert transitions must not erase repeat search state.

```ts
function withSearchHighlight(
  state: ModalState,
  options: ModalOptions,
  query: string,
  current: EditorSnapshot["cursor"],
): ModalState {
  return searchForOptions(options).highlight
    ? { ...state, searchHighlight: { query, current } }
    : state;
}
```

Apply the same separation to clear behavior:

```ts
function clearHighlightsForMode(state: ModalState, mode: VimMode, options: VimEditorOptions): ModalState {
  if (mode !== "insert" || !searchForOptions(options).clearOnInsert) return state;
  const { searchHighlight: _searchHighlight, ...rest } = state;
  return rest;
}
```

### Parse config field-by-field

`piVimMode.search` should have typed options, defaults, and per-field fallback so one invalid setting does not discard valid sibling settings.

```ts
export type VimSearchOptions = {
  highlight: boolean;
  highlightCurrent: boolean;
  clearOnCancel: boolean;
  clearOnInsert: boolean;
  maxHighlights: number;
};
```

### Put literal match range calculation in the buffer layer

Prompt-buffer helpers should own text-to-range conversion and bounds. Renderer code should receive ranges and style precedence, not search text traversal logic.

```ts
while (ranges.length < maxRanges) {
  const match = text.indexOf(query, offset);
  if (match < 0) break;

  ranges.push({
    start: offsetToPosition(text, match),
    end: offsetToPosition(text, match + query.length - 1),
  });
  offset = match + query.length;
}
```

The helper should reject empty or multiline queries and stay literal, bounded by `maxHighlights`, and non-overlapping.

### Render with explicit precedence

Search highlight rendering must compose with existing UI states. Keep precedence stable:

```text
cursor > visual selection > current search > other search > plain text
```

```ts
const searchStyle = searchRangeAt(options, chunk.lineIndex, cellStart);
if (searchStyle === "current") output += styleCurrentSearch(cell);
else if (searchStyle === "other") output += styleSearch(cell);
else output += cell;
```

Use fixed ANSI styles for now. Do not introduce Vim highlight groups or `:nohlsearch` unless there is a broader command-mode design.

### Route options through the live editor adapter

Pure config and modal tests are not enough. `VimEditor` clones options at construction, so every new `VimEditorOptions` field must be preserved there.

```ts
function cloneOptions(options: VimEditorOptions): VimEditorOptions {
  return {
    startMode: options.startMode,
    cursor: { ...options.cursor },
    keymap: options.keymap,
    ui: options.ui,
    macros: options.macros,
    marks: options.marks,
    search: options.search,
  };
}
```

This was the key integration guardrail: `search.highlight: false` can parse correctly and still fail in the live editor if `cloneOptions()` drops `search`.

## Why This Matters

Search highlighting crosses several seams that are easy to test in isolation but still break in the running editor:

- disabled highlight config parses correctly but live rendering ignores it
- visual selection gets hidden by search highlight styling
- `n` and `N` lose repeat behavior after highlight clear
- operator search deletes text but leaves stale highlights
- ANSI styles break width calculations
- README/OpenSpec docs drift from behavior

Separating semantic search state from render-only highlight state keeps behavior predictable. Pairing pure tests with live editor tests catches adapter contract drift.

## When to Apply

- Adding UI-only state to modal editor features.
- Config controls rendering but must not change command semantics.
- State should clear on some mode transitions but preserve command repeatability.
- Rendering must compose with cursor, visual selection, and terminal width constraints.
- New options flow through parsed config, resolved defaults, modal options, and live editor construction.

## Examples

### Config surface

```json
{
  "piVimMode": {
    "search": {
      "highlight": true,
      "highlightCurrent": true,
      "clearOnCancel": true,
      "clearOnInsert": true,
      "maxHighlights": 200
    }
  }
}
```

### Live editor regression test

```ts
const { editor } = createEditor({
  ...DEFAULT_VIM_OPTIONS,
  startMode: "normal",
  search: {
    highlight: false,
    highlightCurrent: true,
    clearOnCancel: true,
    clearOnInsert: true,
    maxHighlights: 200,
  },
});

editor.setText("one two one");
typeKeys(editor, ["g", "g", "/", "o", "n", "e", "\r"]);

expect(editor.getCursor()).toEqual({ line: 0, col: 8 });
expect(editor.render(20).join("\n")).not.toContain(SEARCH_START);
```

This test proves both behaviors: search still moves the cursor, and disabled highlight config reaches the actual render path.

### Prevention checklist

- Add type, default, parser, and accessor for every new option.
- Preserve every new `VimEditorOptions` field in `cloneOptions()`.
- Keep behavior state (`lastSearch`) separate from render state (`searchHighlight`).
- Clear render state on destructive edits or configured transitions only.
- Add pure buffer tests for range calculation.
- Add render tests for precedence and width safety.
- Add live editor tests proving config reaches actual rendering.
- Update README and OpenSpec specs before archiving.

## Related

- `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md` — same adapter-boundary failure mode; moderate overlap around `cloneOptions()` and live editor coverage.
- `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md` — related config-surface guidance; `piVimMode.search` is another native Pi JSON config example.
- `docs/solutions/architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md` — related buffer/render seam pattern.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — refresh candidate because older limitations may still say prompt search is unsupported.
