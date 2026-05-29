---
title: Pi vimmode bar cursor hidden by hardware cursor visibility
date: 2026-05-29
category: docs/solutions/ui-bugs
module: pi-vimmode
problem_type: ui_bug
component: tooling
symptoms:
  - "Configured `bar` cursor style produced no visible vertical cursor"
  - "Cursor cell styling preserved the underlying character but only made it bold"
  - "DECSCUSR cursor-shape escape was written while Pi TUI still hid the hardware cursor"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
related_components:
  - testing_framework
  - renderer
  - pi-tui
tags:
  - pi-vimmode
  - bar-cursor
  - hardware-cursor
  - cursor-marker
  - tui
  - regression-test
---

# Pi vimmode bar cursor hidden by hardware cursor visibility

## Problem

The `bar` cursor style in pi-vimmode became invisible again. The rendered cursor cell still preserved the character under the cursor, but no vertical bar appeared in the prompt editor.

## Symptoms

- User reported: “지금 `bar` 커서가 다시 안 보여” (“the `bar` cursor is not visible again”).
- Insert-mode or configured `bar` modes did not show a vertical cursor.
- The cursor cell could appear as plain or bold text rather than a bar.

## What Didn't Work

The previous bar-cursor rendering fix changed `renderCursorCell(cell, "bar")` to style the existing cell instead of replacing it with a glyph:

```ts
case "bar":
  return `${CURSOR_BAR_START}${safeCell}${ANSI_RESET}`;
```

That preserved the underlying character and avoided width drift, but it did not draw a real vertical bar. `CURSOR_BAR_START` was only bold styling.

Relying on `cursorShapeEscape("bar")` was also insufficient. Pi TUI positions the terminal cursor with `CURSOR_MARKER`, but hides the hardware cursor unless `showHardwareCursor` is enabled:

```js
showHardwareCursor = process.env.PI_HARDWARE_CURSOR === "1";

positionHardwareCursor(cursorPos, totalLines) {
  // ...move cursor to CURSOR_MARKER position...
  if (this.showHardwareCursor) {
    this.terminal.showCursor();
  } else {
    this.terminal.hideCursor();
  }
}
```

So the extension was choosing the bar cursor shape while Pi TUI kept the actual cursor hidden.

## Solution

Make `VimEditor` own the Pi TUI hardware-cursor visibility lifecycle for `bar` cursor styles.

`src/vim-editor.ts` now snapshots the original hardware cursor visibility, enables the hardware cursor when the effective cursor style is `bar`, and restores the original visibility policy for non-bar styles and reset:

```ts
private syncHardwareCursorVisibility(style: CursorStyle): void {
  this.setHardwareCursorVisibility(
    style === "bar" || this.originalHardwareCursorVisible === true,
  );
}

private applyTerminalCursorStyle(style: CursorStyle): void {
  this.syncHardwareCursorVisibility(style);
  if (style === this.lastTerminalCursorStyle) return;
  this.lastTerminalCursorStyle = style;
  this.terminalWrite(cursorShapeEscape(style));
}

resetTerminalCursorStyle(): void {
  this.lastTerminalCursorStyle = undefined;
  if (this.originalHardwareCursorVisible !== undefined) {
    this.setHardwareCursorVisibility(this.originalHardwareCursorVisible);
  }
  this.terminalWrite(RESET_CURSOR_SHAPE);
}
```

The adapter calls Pi TUI's `getShowHardwareCursor()` and `setShowHardwareCursor(...)` methods only when those APIs are available, so tests and nonstandard TUI mocks can still run without the visibility API.

## Why This Works

A visible `bar` cursor needs two independent terminal states:

1. Cursor shape must be set to bar via DECSCUSR (`\x1b[6 q`).
2. Hardware cursor must be visible via Pi TUI's `setShowHardwareCursor(true)` path.

The old implementation did only the first. Pi TUI still called `terminal.hideCursor()`, so the cursor shape never appeared.

The fix synchronizes both layers. When the effective style is `bar`, pi-vimmode enables Pi's hardware cursor and writes the bar shape escape. When leaving `bar` or resetting, it restores the original Pi TUI visibility behavior so block/underline fake-render paths do not unexpectedly show a hardware cursor.

## Prevention

- Test cursor shape escape writes and `setShowHardwareCursor(...)` calls separately.
- Preserve and restore the host TUI's original cursor visibility policy instead of assuming hidden or visible defaults.
- Include a regression path that enters `bar`, leaves `bar`, re-enters `bar`, and resets.

Regression coverage in `test/vim-editor.test.ts` should assert visibility transitions as well as escape writes. The current test starts with hardware cursor visibility `false`; if the host default is `true`, the restore assertions should compare against the captured original value instead:

```ts
expect(writes.at(-1)).toBe("\x1b[6 q");
expect(getHardwareCursorVisible()).toBe(true);

const originalHardwareCursorVisible = false;

editor.handleInput("\x1b");
expect(writes.at(-1)).toBe("\x1b[4 q");
expect(getHardwareCursorVisible()).toBe(originalHardwareCursorVisible);

editor.handleInput("V");
expect(writes.at(-1)).toBe("\x1b[6 q");
expect(getHardwareCursorVisible()).toBe(true);

editor.resetTerminalCursorStyle();
expect(writes.at(-1)).toBe("\x1b[0 q");
expect(getHardwareCursorVisible()).toBe(originalHardwareCursorVisible);
expect(hardwareCursorChanges).toEqual([true, false, true, false]);
```

Verification commands:

```sh
bun test
bun run check-types
bun run lint
bun run format:check src/vim-editor.ts test/vim-editor.test.ts
```

## Related Issues

- `docs/solutions/design-patterns/pi-vimmode-search-highlighting-render-precedence-2026-05-28.md` — related renderer precedence and cursor composition guidance.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — related adapter-boundary guidance for modal effects and terminal cursor hints.
- `openspec/changes/archive/2026-05-29-fix-bar-cursor-hides-character/design.md` — previous bar-cursor fix; now missing the hardware cursor visibility requirement.
- `openspec/specs/vim-mode-visual-configuration/spec.md` — current spec has bar cursor behavior scenarios but should also capture hardware cursor visibility restoration.
