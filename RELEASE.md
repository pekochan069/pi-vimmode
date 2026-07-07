# v0.8.0

## What's new

- Added trusted global JS keybindings via `~/.pi/agent/pi-vimmode.config.js`, including `vim.prompt.*` built-ins and literal key replay mappings.
- Added `/vimmode reload` so JS config and settings changes can be reloaded without restarting Pi.

## Bug fixes

- Fixed issue #11: insert-mode `bar` hardware cursors now stay visible while Pi agent work is active.
- Preserved existing busy-output cursor suppression for non-bar cursor styles.
- Made trusted JS keybindings respect protected Pi shortcuts, project JSON overrides, mode-scoped action conflicts, and remap mode validation.
