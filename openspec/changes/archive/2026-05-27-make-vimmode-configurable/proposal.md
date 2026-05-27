## Why

`pi-vimmode` already supports practical modal editing, but its keymap and status UI are mostly hard-coded. Users who already tune Vim/Neovim expect prompt editing to follow their preferred operators, motions, labels, and cursor-position feedback without forking the extension.

## What Changes

- Add a semantic `piVimMode.keymap` configuration for supported Vim operators, motions, commands, and operator-motion combinations.
- Add a `piVimMode.ui` configuration for mode labels, narrow labels, status item visibility/order, visual selection preview, and optional line/column display.
- Add a small Vim/Neovim-inspired preset/import layer for selected options, not full Vimscript or Lua parsing.
- Preserve existing defaults: current keybindings, mode labels, visual status, startup mode, and cursor styles remain unchanged without config.
- Keep Pi-owned shortcuts delegated by default, especially submit, interrupt, autocomplete, external editor, model/thinking shortcuts, and image paste.

## Capabilities

### New Capabilities

- `vim-keymap-configuration`: configurable semantic keymap for supported operators, motions, commands, and operator-motion matrices.
- `vim-ui-configuration`: configurable Vim status UI elements, labels, ordering, cursor position display, and selected Vim/Neovim-style option import.

### Modified Capabilities

- `extended-vim-keybindings`: fixed operator/motion keybindings become defaults that can be overridden by validated semantic keymap config.
- `vim-mode-editor`: mode feedback remains width-safe by default while user-configured status items may change labels, order, or visibility.
- `vim-mode-visual-configuration`: namespaced read-only settings expand beyond `startMode` and `cursor` to include `keymap` and `ui`, while project settings still override global settings field by field.

## Impact

- Affected code: `src/config.ts`, `src/types.ts`, `src/commands.ts`, `src/modal/engine.ts`, `src/modal/view.ts`, `src/vim-editor.ts`, and related tests.
- Affected docs: `README.md` settings/keymap/status sections and limitations.
- Compatibility: no breaking change for existing `piVimMode.startMode` or `piVimMode.cursor` users; invalid config falls back per field with warnings.
- Dependencies: no new runtime dependency planned.
