# v0.4.0

## What's new

### Protected shortcut overrides

- Added `piVimMode.keymap.allowProtectedOverrides` for explicitly binding protected Pi shortcuts such as `ctrl+p`, `ctrl+t`, and `tab`.
- Allow-listed protected keys can be used in classic keymap groups, insert escape aliases, and action keybindings within the same settings layer.
- Normal and visual modes now route accepted protected bindings through pi-vimmode instead of always delegating them to Pi.
- Documented override scope, rollback, and terminal limits in `docs/settings.md` and `docs/features.md`.

### Insert-mode newline keybindings

- Added `piVimMode.keymap.insert.openLineBelow` and `openLineAbove` for configuring insert-mode line opening (e.g., `ctrl+j` to open a line below, `ctrl+k` above) while staying in insert mode.
- Validates bindings: printable text keys rejected (would conflict with typing), protected keys require `allowProtectedOverrides`.
- Reuses existing `openLineBelow`/`openLineAbove` buffer helpers — no new line manipulation logic.
- Insert-mode dispatch fires after escape aliases and autocomplete check, before Pi delegation.
- No registers, marks, visual state, macros, or dot-repeat affected.
- Documented in `docs/settings.md` and `docs/features.md`.

### Visual reselection (`gv`)

- Added Vim-style `gv` to re-enter the last valid visual selection from normal mode.
- Preserves characterwise, linewise, and blockwise visual selections by restoring the previous visual mode, anchor, and active cursor.
- Added `piVimMode.keymap.commands.reselectVisual` with default `gv` for semantic keymap customization.
- Safely no-ops when no previous selection exists or the stored selection is stale after prompt edits.
- Documented visual reselection in `docs/features.md`, `docs/settings.md`, and OpenSpec requirements.

### Ex line jumps

- Added bare single-address Ex line jumps such as `:3`, `:.`, `:$`, and `:2+1`.
- Line jumps move the cursor only, preserve prompt text and Vim state, and reject commandless ranges such as `:%` and `:2,4`.
- `parseExCommand()` now returns a `lineJump` parse result for successful bare single-address jumps.

### Ex quit commands

- Added `:q` and `:quit` as finite Ex commands that request graceful Pi shutdown through the extension runtime.
- Quit commands preserve prompt text, registers, marks, search state, macros, cursor, and dot-repeat.
- Unsupported file/window/shell variants such as `:q!`, `:wq`, `:x`, `:qa`, `:write`, and `:shell` remain rejected.

### Ex command autocomplete

- Added bounded Ex command suggestions for the finite command surface, including configured prompt transform command aliases.
- Suggestions are alphabetized, width-safe, and aligned with Pi-style selection rows.
- `Tab` completes command words without changing prompt text or command execution semantics.
- Added `piVimMode.exCommand.autocomplete` to disable suggestion navigation and hide the autocomplete UI.

## Bug fixes

- `isPrintableTextSequence` now also rejects named non-printable keys (`enter`, `tab`, `escape`, etc.) in addition to modifier-prefixed keys, making it correct for both escape alias and insert binding validation.
- Kept protected shortcuts delegated by default unless the same settings layer allow-lists them.
- Preserved Pi-owned insert-mode behavior for protected shortcuts unless they are configured as insert escape aliases.
- Avoided false prefix-shadow conflicts between chorded keys such as `ctrl+p` and plain Vim grammar prefixes.
- Captured visual selection history across visual exits, including visual Ex entry and mutating visual operations, so `gv` does not lose the last selection.
- Rejected stale `gv` reselection after prompt edits by validating the stored source text and saved positions before restoring visual mode.
