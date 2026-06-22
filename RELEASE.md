# v0.4.0

## What's new

### Protected shortcut overrides

- Added `piVimMode.keymap.allowProtectedOverrides` for explicitly binding protected Pi shortcuts such as `ctrl+p`, `ctrl+t`, and `tab`.
- Allow-listed protected keys can be used in classic keymap groups, insert escape aliases, and action keybindings within the same settings layer.
- Normal and visual modes now route accepted protected bindings through pi-vimmode instead of always delegating them to Pi.
- Documented override scope, rollback, and terminal limits in `docs/settings.md` and `docs/features.md`.

## Bug fixes

- Kept protected shortcuts delegated by default unless the same settings layer allow-lists them.
- Preserved Pi-owned insert-mode behavior for protected shortcuts unless they are configured as insert escape aliases.
- Avoided false prefix-shadow conflicts between chorded keys such as `ctrl+p` and plain Vim grammar prefixes.
