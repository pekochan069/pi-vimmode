---
title: Vim status feedback should not replace autocomplete rows
date: 2026-06-15
category: ui-bugs
module: pi-vimmode
problem_type: ui_bug
component: tooling
symptoms:
  - "Insert-mode autocomplete completion rows disappeared or were overwritten while Vim status feedback was visible"
  - "The `INSERT` status could occupy the row that should have contained a completion item"
  - "Multi-row autocomplete output risked losing its final visible completion row"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - testing_framework
  - prompt-renderer
tags:
  - pi-vimmode
  - autocomplete
  - custom-editor
  - status-row
  - render-composition
  - workbench
  - typescript
---

# Vim status feedback should not replace autocomplete rows

## Problem

Insert-mode autocomplete rows are owned by Pi's `CustomEditor`, but `VimEditor` also renders Vim mode/status feedback. The status renderer replaced the last row from `super.render(width)`, so when autocomplete was open it could replace the final completion row instead of decorating only the prompt/status area.

## Symptoms

- Typing in insert mode opened autocomplete, but the final visible completion row could disappear.
- The `INSERT` status remained visible by occupying space that should have stayed Pi-owned completion UI.
- Multi-row completion lists were vulnerable because the last visible completion row was the row most likely to be replaced.
- Pending `/`, `?`, `:`, or Ex feedback rows needed to remain visible without stealing autocomplete rows.

## What Didn't Work

- Treating `super.render(width)` as though its final row was always safe to replace.

```ts
lines[last] = fitStatusBorder(status.left, status.right, width, this.borderColor);
```

That assumption is only safe when the base render output is just the prompt/editor surface. Once `CustomEditor` adds autocomplete rows, the final line can be a completion item.

- Moving autocomplete behavior into Vim-specific rendering was not appropriate. Autocomplete is host-editor UI, so `VimEditor` should preserve it rather than reimplement or restyle it.

## Solution

Keep the normal status replacement path when autocomplete is closed, but append Vim status as its own row when autocomplete is open.

```ts
const statusLine = fitStatusBorder(status.left, status.right, width, this.borderColor);
if (this.isShowingAutocomplete()) lines.push(statusLine);
else lines[last] = statusLine;
lines.push(...workbenchRows);
return lines;
```

Also avoid the reserved-workbench-row render path while autocomplete is open. In the base render helper, let `CustomEditor` render prompt plus completion rows and apply only cursor-marker restyling there; status and workbench composition still happens afterward in `render()`.

```ts
if (this.isShowingAutocomplete()) {
  return restyleCursorMarker(super.render(width), this.getCurrentCursorStyle());
}
```

This keeps the row ownership model explicit:

```text
prompt row
CustomEditor autocomplete rows
Vim status row
Vim workbench rows for /, ?, :, and Ex messages
```

## Why This Works

`CustomEditor` remains the source of truth for autocomplete layout. `VimEditor` no longer assumes that the final row returned by `super.render(width)` is replaceable when completion UI is open.

The fix preserves both visibility requirements:

1. Pi-owned autocomplete rows stay intact.
2. Vim mode/status feedback remains visible on a separate width-fitted row.

Workbench feedback still appends after status; regression tests cover search and Ex visibility while autocomplete is open.

## Prevention

When changing `VimEditor` row composition, add live render tests covering host-owned rows from `CustomEditor`.

Regression coverage added in `test/vim-editor.test.ts`:

- One visible autocomplete row keeps both completion text and `INSERT` status visible.
- Multiple visible completion rows all remain present.
- Narrow terminal widths remain width-safe.
- Disabled mode feedback hides `INSERT` without hiding completion rows.
- Pending search, backward search, Ex input, and Ex messages still render workbench rows while autocomplete is open.

Use an actual autocomplete provider in tests rather than mocking rendered strings, because the bug lived at the `CustomEditor.render()` / `VimEditor.render()` boundary.

```ts
installAutocomplete(editor, ["/alpha", "/bravo", "/charlie"], 3);
editor.handleInput("/");
await flushAutocomplete();

const rendered = editor.render(48).join("\n");
expect(rendered).toContain("/alpha");
expect(rendered).toContain("/bravo");
expect(rendered).toContain("/charlie");
expect(rendered).toContain("INSERT");
```

Validation run after the fix:

```sh
bun test
bun run check-types
bun run lint
bun run format:check
openspec validate --specs --strict
```

## Related Issues

- `docs/solutions/ui-bugs/visual-block-insert-preview-hidden-2026-05-27.md` — similar hidden insert-mode UI caused by a `CustomEditor` adapter/render ownership gap.
- `docs/solutions/ui-bugs/ex-substitution-match-preview-highlighting-2026-06-04.md` — related workbench feedback visibility and live-render regression testing pattern.
- `docs/solutions/design-patterns/pi-vimmode-read-only-help-overlay-ui-2026-06-09.md` — related row ownership distinction for overlay/workbench UI, with the caveat that host autocomplete rows must be preserved inline.
