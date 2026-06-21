## Why

Users who keep hands on the home row often use home-row modifier tools to send keys such as `Ctrl-J` or `Cmd-J` instead of reaching for physical `Esc`. pi-vimmode currently hard-codes insert-mode exit to physical `Esc`, so users cannot opt into that workflow through existing keymap settings.

## What Changes

- Add an opt-in escape keymap setting for modified keys such as `<C-j>` or `<D-j>`.
- Treat configured escape sequences as aliases for `Esc`: exit insert mode when autocomplete is inactive, exit visual modes, and preserve Pi/autocomplete behavior when autocomplete is active.
- Preserve physical `Esc`, Pi protected shortcuts, prompt submission, normal-mode keymaps, and default insert typing when no setting is configured.
- Add validation, diagnostics/help/catalog output, tests, and docs for configured insert escape sequences.
- Do not add new runtime dependencies.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-keymap-configuration`: Add validated `piVimMode.keymap.escape` modified-key aliases for insert/visual/Ex escape while keeping protected shortcuts and raw text guarded.
- `vim-mode-editor`: Allow configured escape aliases to leave insert mode, visual modes, and pending Ex command-lines without changing default insert-mode delegation, autocomplete, or Pi shortcut behavior.

## Impact

- Affected code seams: `src/types.ts`, `src/config.ts`, `src/modal/types.ts`, `src/modal/engine.ts`, `src/modal/core.ts` or small modal helpers, `src/vim-editor.ts` fast-path guard, `src/customization.ts`, and runtime help/docs metadata if needed.
- Tests: config validation tests, modal insert alias tests, fast-path regression tests, live `VimEditor` tests for `<C-j>`/`<D-j>`, raw `jk`/`jj` rejection, autocomplete preservation, and protected-key rejection.
- Docs: `docs/settings.md`, `docs/features.md`, runtime help/keybinding discovery metadata and drift guard fixtures where applicable.
- Dependencies: no new runtime dependencies.
- Compatibility: no breaking changes; default behavior remains unchanged unless users configure `piVimMode.keymap.escape`.

## Non-goals

- Do not implement full Vim/Neovim insert-mode mappings, recursive mappings, timeoutlen, `.vimrc`, Vimscript, or Lua config.
- Do not make raw normal/visual `j`, `k`, or other existing text keys behave like escape aliases.
- Do not let custom insert escape sequences steal Pi submit, autocomplete, interrupt, or palette shortcuts.
- Do not edit user settings files.
