## Why

Users currently repeat a physical prefix across JSON and trusted JavaScript mappings, making one personal keymap hard to move between projects or leader choices. An optional leader setting gives pi-vimmode one reusable mapping prefix without adding recursive mappings or broader Vimscript support.

## What Changes

- Add optional `piVimMode.leader` support to global and project `settings.json` files.
- Add `vim.g.mapleader` support to trusted global `pi-vimmode.config.js`.
- Expand case-insensitive `<leader>` placeholders in configured mapping keys that begin with the token, using one final effective leader after normal settings-layer precedence.
- Allow later layers to clear an inherited leader with `null`; keep leader unset by default.
- Reserve a configured leader prefix across normal and visual grammar when any retained normal/visual mapping begins with `<leader>`; insert-only mappings do not activate reservation.
- Validate leader values and unresolved, bare, or otherwise illegal leader mappings with non-fatal field-level warnings.
- Show expanded physical keys in resolved keybinding views.

### Non-goals

- No default leader key.
- No timeout fallback for bindings that are both exact keys and longer prefixes.
- No expansion in replay RHS inputs.
- No recursive mappings, runtime `:map`, Vimscript, or Neovim Lua support.
- No new insert-mode pending sequence behavior or relaxation of existing mapping-category legality rules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-keymap-configuration`: Define leader settings, layered precedence, placeholder expansion, prefix reservation, validation, and trusted JavaScript builder behavior.

## Impact

Affects `src/types.ts`, `src/config.ts`, `src/config-js.ts`, keymap resolution and normal/visual dispatch in `src/commands.ts` and `src/modal/engine.ts`, focused config/modal tests, `docs/settings.md`, `docs/features.md`, and README limitations/examples where leader maps are currently excluded. No new runtime dependencies or peer changes. Existing configurations remain compatible because leader defaults to unset; no breaking change.
