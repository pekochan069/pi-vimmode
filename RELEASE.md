# v0.7.0

## Breaking changes

- `Ctrl-v` no longer enters visual block mode by default. `Ctrl-v`, Windows `Alt-v`, and `Ctrl-Alt-v` now delegate to Pi for image/clipboard paste in normal and visual modes unless explicitly rebound.
- Visual block mode now has an empty default keybinding. Configure `piVimMode.keymap.commands.visualBlock` with a non-protected key such as `<A-b>`, or explicitly allow and bind `<C-v>` with `piVimMode.keymap.allowProtectedOverrides`.

## What's new

- Added protected-shortcut diagnostics/help for Pi-owned image/clipboard paste shortcuts.
- Visual block entry now goes through the configurable `commands.visualBlock` keymap path instead of hidden hard-coded `Ctrl-v` handling.

## Bug fixes

- Fixed normal/visual mode image paste being swallowed by pi-vimmode visual-block handling.
