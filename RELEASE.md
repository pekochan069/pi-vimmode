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

## Bug fixes

- `isPrintableTextSequence` now also rejects named non-printable keys (`enter`, `tab`, `escape`, etc.) in addition to modifier-prefixed keys, making it correct for both escape alias and insert binding validation.
- Kept protected shortcuts delegated by default unless the same settings layer allow-lists them.
- Preserved Pi-owned insert-mode behavior for protected shortcuts unless they are configured as insert escape aliases.
- Avoided false prefix-shadow conflicts between chorded keys such as `ctrl+p` and plain Vim grammar prefixes.
