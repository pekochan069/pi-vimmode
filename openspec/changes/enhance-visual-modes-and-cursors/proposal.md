## Why

Current `pi-vimmode` visual mode is functional but hard to see because selected text is not highlighted, and it only supports characterwise visual selection. Users also cannot choose startup mode or cursor presentation per mode, which makes the extension less Vim/Neovim-like and less adaptable to different terminal/editor preferences.

## What Changes

- Add visible highlighting for text selected in characterwise visual mode.
- Add visual line mode for linewise selection and linewise yank/delete/change operations.
- Add configuration for initial Vim mode when a prompt editor is created.
- Add configuration for cursor style per Vim mode, similar to Vim/Neovim cursor-shape customization.
- Update documentation and tests for visual highlighting, visual line behavior, startup mode, and cursor configuration.

## Capabilities

### New Capabilities

- `vim-mode-visual-configuration`: Visual selection presentation, visual line mode, startup mode configuration, and per-mode cursor configuration for the Pi Vim editor.

### Modified Capabilities

## Impact

- Affects `src/types.ts`, `src/buffer.ts`, `src/commands.ts`, `src/vim-editor.ts`, and `src/index.ts`.
- Adds or updates tests under `test/` for linewise visual ranges, visual operations, config parsing/defaults, and mode-specific cursor behavior.
- Updates `README.md` with new keymap entries, settings, cursor behavior, and limitations.
- No Pi core changes expected; implementation should continue using public `CustomEditor`/TUI APIs and preserve Pi shortcut delegation.
