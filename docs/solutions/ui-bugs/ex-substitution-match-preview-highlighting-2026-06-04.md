---
title: Ex Substitution Preview Should Highlight Matches, Not Imply Replacement Preview
date: 2026-06-04
category: ui-bugs
module: pi-vimmode
problem_type: ui_bug
component: tooling
symptoms:
  - "Ex substitution preview message said substitutions were previewed, but replacement text was not visible"
  - "First Enter only showed a workbench row message while prompt text stayed unchanged"
root_cause: logic_error
resolution_type: code_fix
severity: low
related_components:
  - modal-engine
  - prompt-renderer
  - ex-command-line
tags:
  - pi-vimmode
  - ex-substitution
  - match-preview
  - search-highlight
  - workbench
---

# Ex Substitution Preview Should Highlight Matches, Not Imply Replacement Preview

## Problem

The Ex substitution workbench used the message `4 substitutions previewed; Enter applies, Esc cancels`, but the prompt did not show replacement text before confirmation. The behavior was safe, but the wording implied a visual replacement preview that did not exist.

## Symptoms

- First `Enter` on a substitution command only displayed a count row.
- Prompt text stayed unchanged, as intended.
- No target text was highlighted, so users could not see what would be affected.
- The message used `previewed`, which made the count-only confirmation feel broken.

Example report:

```text
4 substitutions previewed; Enter applies, Esc cancels 는 뜨는데 프리뷰는 안 보이는거같은데
```

## What Didn't Work

- Treating the existing message as sufficient did not match user expectations. A preview row without visible affected text reads like missing UI.
- Rendering replacement text before confirmation was rejected. It would make the displayed prompt diverge from the real prompt buffer, complicating cursor placement, wrapping, visual selection, undo/redo, and cancellation.
- Keeping only a count would preserve safety, but it would not help users inspect broad substitutions before applying them.

## Solution

Make the first `Enter` a **match preview**, not a replacement preview:

1. Keep prompt text unchanged until confirmation.
2. Highlight the source ranges that will be replaced.
3. Change the workbench message to report matches, not previewed substitutions.
4. Apply the cached edit only on the second unchanged `Enter`.
5. Clear the match preview on `Esc`, typing, backspace, history navigation, or a new workbench entry.

The resulting user flow:

```vim
:%s/foo/bar/g
```

First `Enter`:

```text
4 matches found; Enter applies, Esc cancels
```

The `foo` ranges are highlighted, but the prompt still contains `foo`.

Second `Enter` applies the replacement and reports normal Ex success:

```text
4 substitutions
```

### Buffer layer: return source ranges

`src/buffer.ts` now returns match ranges along with the edit and count:

```ts
export type SubstituteLineRangeResult = {
  edit: EditResult;
  matches: number;
  ranges: TextRange[];
};
```

Literal and regex substitution helpers collect source ranges before building the replacement edit. `TextRange.end` is inclusive.

Literal match index:

```ts
ranges.push({ start: match, end: match + pattern.length - 1 });
```

Regex match object:

```ts
ranges.push({ start: match.index, end: match.index + match[0].length - 1 });
```

Those line-local ranges are converted into prompt `TextRange` values:

```ts
ranges.push({
  start: { line: lineIndex, col: range.start },
  end: { line: lineIndex, col: range.end },
});
```

### Modal layer: store preview ranges

`src/modal/types.ts` stores the ranges in `ExSubstitutionPreview`:

```ts
export type ExSubstitutionPreview = {
  command: string;
  matches: number;
  ranges: TextRange[];
  edit: EditResult;
  message: string;
};
```

`src/modal/engine.ts` stores those ranges and uses accurate wording:

```ts
const message = `${result.matches} ${result.matches === 1 ? "match" : "matches"} found; Enter applies, Esc cancels`;

preview: {
  command: pendingEx.command,
  matches: result.matches,
  ranges: result.ranges,
  edit: result.edit,
  message,
}
```

### Render layer: reuse search highlighting

`src/render.ts` allows explicit ranges in `SearchHighlightRenderInput`:

```ts
export type SearchHighlightRenderInput = {
  query: string;
  current?: Position;
  currentRange?: TextRange;
  ranges?: TextRange[];
  highlightCurrent: boolean;
  maxHighlights: number;
};
```

`src/vim-editor.ts` maps active substitution preview ranges into the existing search-highlight render path. The empty `query` is a compatibility shim for the current shared render input shape; a future cleanup could split query and explicit-range highlighting into a discriminated union.

```ts
if (preview) {
  return {
    query: "",
    ranges: preview.ranges,
    highlightCurrent: false,
    maxHighlights: search.maxHighlights,
  };
}
```

## Why This Works

The fix aligns the UX contract with actual editor state:

- `matches found` describes exactly what is shown.
- Highlighted target ranges give users visible confidence before broad edits.
- Prompt text remains truthful until confirmation.
- `Esc` cancellation stays simple because there is no virtual replacement buffer to restore.
- Existing search-highlight precedence continues to handle cursor, visual selection, and match rendering.

The key design rule is:

> Preview should show enough to make confirmation safe without creating fake editor state.

## Prevention

- Avoid the word `preview` unless the UI shows visible target/result state.
- For two-phase destructive or broad edits, prefer match/range highlighting before replacement rendering unless the editor has a real virtual-buffer model.
- Store renderable source ranges with preview state, not only counts or edit results.
- Reuse an existing highlight renderer when match preview semantics are enough.
- Add live editor tests for both the workbench message and visible highlight escape codes.

Regression checks used here:

```bash
bun test
bun run check-types
bun run lint
bun run format:check
openspec validate --specs --strict
```

## Related Issues

- `docs/solutions/design-patterns/pi-vimmode-search-highlighting-render-precedence-2026-05-28.md` — related render-precedence pattern; future refresh should mention `?` and Ex substitution match previews.
- `docs/solutions/architecture-patterns/pi-vimmode-ex-command-line-substitution-architecture-2026-05-28.md` — original Ex substitution architecture; later safe workbench extends it with bounded regex, history, and match preview.
- `docs/solutions/architecture-patterns/pi-vimmode-finite-ex-line-commands-architecture-2026-06-01.md` — related finite Ex architecture; some out-of-scope statements are superseded by the safe workbench.
- `docs/solutions/ui-bugs/visual-block-insert-preview-hidden-2026-05-27.md` — similar UX failure mode where preview state existed but was not visibly rendered.
