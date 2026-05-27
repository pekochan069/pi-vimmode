## Context

`pi-vimmode` currently replaces Pi's prompt editor with `VimEditor extends CustomEditor`. It supports insert, normal, and characterwise visual modes; visual selection is represented only by status text, not highlighted editor text. The current render path calls `super.render(width)` and only replaces the bottom border/status line, so the cursor is always Pi's default reverse-video block and the selected range has no inline styling.

Relevant constraints:

- `CustomEditor` must remain the integration boundary so Pi app shortcuts keep working through `super.handleInput(data)`.
- Public editor APIs expose text, lines, cursor, `setText()`, and `insertTextAtCursor()`, but not direct cursor mutation.
- Pi's `Editor.render()` handles wrapping, scroll, fake cursor display, and the `CURSOR_MARKER` hardware-cursor marker internally; its layout state is private.
- Pi does not expose a public extension settings accessor, so extension-specific settings need a namespaced config reader rather than changes to Pi core.

## Goals / Non-Goals

**Goals:**

- Highlight selected text in characterwise visual mode without changing buffer contents.
- Add Vim-style visual line mode entered with `V`, including linewise yank/delete/change behavior.
- Add user configuration for startup mode and per-mode cursor style.
- Keep Pi shortcut compatibility and default editing behavior intact.
- Keep range math, config parsing, and rendering decisions testable with pure helpers.

**Non-Goals:**

- Block visual mode, visual block operations, search, ex commands, marks, macros, named registers, or system clipboard integration.
- Pi core patches or mutation of private editor state for cursor movement.
- Full Neovim cursor option parity, blink timing, or terminal-specific cursor-shape negotiation.
- Perfect grapheme-cluster parity beyond the string-column coordinates already used by Pi's editor.

## Decisions

### Model visual line as a first-class Vim mode

Extend `VimMode` to include `visualLine` and track one shared `visualAnchor` for both visual kinds. Normal-mode `v` enters `visual`; normal-mode `V` enters `visualLine`. Visual modes can switch between `v` and `V`, clear selection with `Esc`, and delegate Pi-owned control keys as today.

Alternatives considered:

- Keep mode as `visual` plus a separate `visualKind`: fewer mode strings, but cursor settings and status labels need per-mode behavior anyway.
- Implement linewise behavior only as commands in characterwise visual mode: not Vim-like and makes user feedback ambiguous.

Rationale: `visualLine` as an explicit mode makes key handling, status text, cursor config, and tests straightforward.

### Keep linewise range operations pure

Add helpers that convert an anchor/current cursor into an inclusive line range, extract full selected lines, and apply linewise yank/delete/change. Linewise registers should reuse the existing `{ type: "line", text }` shape so `p` continues to paste below the cursor line. Deleting every line must leave an editable empty prompt and restore cursor to `{ line: 0, col: 0 }`.

Alternatives considered:

- Reuse repeated `deleteLine()` calls: simpler but causes repeated undo snapshots and harder cursor/register behavior.
- Encode linewise visual text as charwise text with trailing newlines: conflicts with existing paste semantics.

Rationale: Pure, single-step linewise helpers preserve current testing style and avoid UI coupling.

### Render selected text through a small view-model layer

For modes without active selection, keep using `super.render(width)` and the current status-border replacement. For active visual modes, render editor content through a local, testable view-model helper that mirrors Pi's public wrapping rules with exported TUI utilities such as `wordWrapLine`, `visibleWidth`, `truncateToWidth`, and `CURSOR_MARKER`. The helper should emit highlighted spans for selected cells, emit the configured fake cursor style at the active cursor, keep every rendered line width-safe, then reuse the existing bottom status border.

Alternatives considered:

- Post-process `super.render(width)`: hard to map ANSI-decorated output back to logical positions, especially around cursor styling and wrapping.
- Access Pi's private `layoutText()` or editor state: accurate but fragile across Pi versions.
- Reimplement the whole editor render path permanently: higher maintenance cost and unnecessary outside active visual modes.

Rationale: Active selection is the only case that needs inline highlight. A constrained renderer avoids private APIs while keeping normal insert/normal rendering stable.

### Use reverse-video selection highlight with cursor precedence

Highlight selected text with ANSI reverse-video (or a theme-derived equivalent if one is already available). When the cursor is inside the selected range, cursor styling must remain visible and take precedence over selection highlighting.

Alternatives considered:

- Add a new theme contract for visual selections: cleaner long-term but outside this extension-only change.
- Highlight via status text only: fails the requested visual-mode behavior.

Rationale: Reverse-video is dependency-free, width-neutral, and works in common terminals.

### Load namespaced extension settings from Pi settings files

Add a small config module that reads `piVimMode` from `~/.pi/agent/settings.json` and `<cwd>/.pi/settings.json`, merging project settings over global settings. Defaults:

```json
{
  "piVimMode": {
    "startMode": "insert",
    "cursor": {
      "insert": "bar",
      "normal": "block",
      "visual": "block",
      "visualLine": "block"
    }
  }
}
```

Supported cursor styles are `block`, `bar`, and `underline`. Supported startup modes are `insert` and `normal`; visual modes are not valid startup modes because they require an anchor. Invalid config values should fall back to defaults and surface a concise `pi-vimmode` status/warning rather than throwing during session startup.

Alternatives considered:

- CLI flags via `pi.registerFlag()`: useful for overrides, but the request asks for settings and flags are not persistent defaults.
- New Pi settings API: cleaner but requires Pi core work.
- Extension-local config file only: avoids raw settings parsing but hides config from Pi's existing settings locations.

Rationale: A namespaced config object gives users persistent settings now without broad Pi core changes.

### Apply cursor style in the rendered editor and terminal cursor

Represent cursor styles with a pure mapping from `VimMode` to `CursorStyle`. The visual renderer should draw fake cursor shapes matching the active mode (`block`, `bar`, `underline`). During mode transitions and editor installation, also send standard DECSCUSR terminal cursor-shape escape sequences through `this.tui.terminal.write()` as a best-effort hardware cursor hint, then reset to default on shutdown when possible.

Alternatives considered:

- Hardware cursor only: Pi's fake cursor would still look like a block in the render output.
- Fake cursor only: enough for screenshots/tests but less Vim-like in terminals that show hardware cursor shape.

Rationale: Combining render-level cursor styling with best-effort terminal cursor hints matches user expectations while keeping behavior safe if a terminal ignores the escape sequence.

## Risks / Trade-offs

- Visual renderer can drift from Pi's private editor render behavior → Keep it scoped to active visual selection, use exported TUI helpers, and cover width/cursor cases with tests.
- Reading raw settings files can drift from Pi settings internals → Use a namespaced optional object, tolerate parse/missing-file errors, and avoid writing settings.
- Terminal cursor shape escape sequences are not supported everywhere → Treat them as best-effort and keep fake cursor rendering as the reliable source of truth.
- Visual highlighting across wrapped lines can expose off-by-one range bugs → Add tests for single-line, multi-line, reversed, and wrapped selections.
- Startup in normal mode can surprise users expecting immediate typing → Default remains configurable and documented; `insert` remains the default startup mode.

## Migration Plan

1. Add config types/defaults/parser and wire the editor factory to pass parsed options into `VimEditor`.
2. Extend mode types and visual state for `visualLine`.
3. Add pure linewise visual range helpers and tests.
4. Add active-visual rendering helper with selection highlighting and cursor-style output.
5. Update key handling, status labels, README settings docs, and validation tests.
6. Validate with `bun test`, `bun run check-types`, and manual Pi smoke testing.

Rollback is disabling/removing the extension or reverting to default settings; no user data migration is required.

## Open Questions

- Should CLI flags be added later as temporary overrides for settings values?
- Should visual selection colors become theme-configurable if Pi exposes a selection style token later?
