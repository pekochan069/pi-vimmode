## 1. JS builder API

- [x] 1.1 Add trusted global JS config loader at `~/.pi/agent/pi-vimmode.config.js`.
- [x] 1.2 Expose `vim.prompt.*` built-ins for prompt transforms and supported insert actions.
- [x] 1.3 Make `vim.keymap.set(mode, key, builtin)` accept string keys and reject string RHS/internal IDs.
- [x] 1.4 Add additive merge semantics for JS builder keymaps between global and project JSON.

## 2. Mode-scoped actions

- [x] 2.1 Add mode metadata to action keybinding entries.
- [x] 2.2 Resolve action keybindings only in configured normal/visual modes.

## 3. Validation and docs

- [x] 3.1 Add JS config loader tests.
- [x] 3.2 Update existing config tests for async JS-aware loading.
- [x] 3.3 Document trusted JS config in `docs/settings.md` and `docs/features.md`.
- [x] 3.4 Run full validation suite.
