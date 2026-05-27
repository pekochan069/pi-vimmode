## Context

`pi-vimmode` is currently a minimal Bun/TypeScript package with no extension entrypoint. Pi supports custom editor replacement through `ctx.ui.setEditorComponent()` and `CustomEditor`. The extension must operate inside Pi's prompt editor, not as an input transform, because Vim behavior needs per-key modal state before prompt submission.

Pi editor constraints shape the implementation:

- `CustomEditor` preserves Pi app shortcuts when unhandled keys are delegated to `super.handleInput(data)`.
- Public editor APIs expose `getText()`, `getLines()`, `getCursor()`, `setText()`, and `insertTextAtCursor()`, but no public `setCursor()`.
- `setText()` resets cursor to end of buffer, so structural edits need explicit cursor restoration via public movement sequences.
- Render output must respect the supplied width; mode labels must use ANSI-aware width helpers.

## Goals / Non-Goals

**Goals:**

- Provide a working Pi extension that installs/loads as a package and replaces the main prompt editor.
- Support practical Vim prompt editing with insert, normal, and characterwise visual modes.
- Preserve Pi app semantics for submit, interrupt, clear, exit, external editor, autocomplete, model/thinking shortcuts, and image paste.
- Keep behavior testable by isolating text-buffer and command-parser logic into pure functions.
- Document supported keymap, install path, and known limitations.

**Non-Goals:**

- Full Vim parity.
- Block visual mode, visual line mode, macros, marks, search, ex commands, named registers, or system clipboard integration.
- Patching Pi core or using private editor internals for cursor mutation.
- Perfect visual selection highlighting across wrapped terminal lines in the first version.

## Decisions

### Use `CustomEditor` as the integration layer

Build `VimEditor extends CustomEditor` and register it on `session_start` with `ctx.ui.setEditorComponent()`.

Alternatives considered:

- `keybindings.json`: can add Vim-like shortcuts, but cannot implement modes or visual selection.
- `input` event: runs after prompt submission, too late for modal editing.
- Base TUI `Editor`: would lose Pi app action handling.

Rationale: `CustomEditor` is the documented extension point for Vim-style editors and preserves Pi app keybindings when unhandled input delegates to `super.handleInput(data)`.

### Prefer Pi compatibility over strict Vim conflicts

Insert mode delegates to the default editor. Normal and visual modes intercept only recognized Vim printable commands and pass unknown control/non-printable input to Pi.

Conflict choices:

- `Esc`: insert/visual changes mode; normal delegates to Pi interrupt/abort.
- `Enter`: remains Pi submit behavior in insert mode; normal-mode Enter is not an MVP Vim motion.
- `Ctrl+C`, `Ctrl+D`, `Ctrl+G`, model/thinking shortcuts: delegate rather than reinterpret.

Rationale: Pi prompt safety and app controls matter more than strict Vim semantics in conflict cases.

### Keep core text operations pure

Implement buffer helpers for ranges, line deletion/yank/paste, and cursor targets. `VimEditor` owns mode state and calls helpers, then writes text back.

Alternatives considered:

- Put all logic in `handleInput()`: fast initially but hard to test.
- Use private editor state for edits: simpler cursor handling but fragile across Pi releases.

Rationale: Pure helpers allow Bun tests without launching Pi and reduce regression risk.

### Restore cursor through public movement sequences

After structural `setText()` operations, restore cursor by moving from the post-`setText()` end position to the target position using delegated key sequences (`up`, `home`, `right`).

Alternatives considered:

- Access private editor state: accurate but unsupported.
- Accept cursor-at-end after every edit: poor Vim UX.

Rationale: Public movement is stable and acceptable for prompt-sized buffers.

### Ship visual operations before visual highlighting

Visual mode will track an anchor, show a `VISUAL` indicator plus selection summary, and make `y`, `d`/`x`, and `c` operate on the selected range. Full highlighted selection rendering can follow later.

Alternatives considered:

- Reimplement editor rendering to highlight selection: higher risk because Pi wraps lines and injects ANSI cursor styling.
- Omit visual mode until highlighting is perfect: fails the primary user need.

Rationale: Functional visual selection solves the missing capability; highlighting is polish.

## Risks / Trade-offs

- Public cursor restoration is O(lines + columns) after structural edits → Prompts are small; keep helpers bounded and tested.
- Visual selection without full highlight may feel incomplete → Show clear `VISUAL` mode/status and selection size; add highlight later if needed.
- Autocomplete may conflict with normal/visual key handling → Insert mode delegates fully; non-insert modes should delegate non-printable control sequences and avoid stealing app shortcuts.
- `CustomEditor` API may change across Pi versions → Use documented imports and avoid private internals.
- Runtime package dependency resolution may differ between local and installed extension usage → declare Pi entry in `package.json` and keep runtime imports aligned with documented package APIs.

## Migration Plan

1. Add package metadata, source files, tests, and README in this extension package.
2. Validate with `bun test` and `bun run check-types`.
3. Smoke test locally with Pi loading `./src/index.ts` or package-configured extension path.
4. Roll back by disabling/removing the extension; no Pi core state or user data migration needed.

## Open Questions

- Should normal-mode `Enter` eventually be a Vim line motion or always preserve Pi submit behavior?
- Should visual selection highlighting be added before publishing beyond local use?
- Should registers integrate with system clipboard or remain extension-local for v1?
