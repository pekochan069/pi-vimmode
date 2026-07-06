## Why

`Ctrl-v` is currently hard-coded as visual-block entry in normal and visual modes before protected Pi shortcut delegation can run. That blocks Pi or extension-provided image paste handlers, so users who copy an image and press `Ctrl-v` in normal mode enter `V-BLOCK` instead of pasting the image.

This conflicts with pi-vimmode's Pi compatibility boundary: app-level shortcuts such as image paste should remain Pi-owned unless the user explicitly opts into a Vim binding.

## What Changes

- Treat `Ctrl-v`, Windows-style `Alt-v`, and `Ctrl-Alt-v` as protected Pi clipboard/image-paste shortcuts by default in normal and visual dispatch.
- Remove the hidden hard-coded `Ctrl-v` visual-block branch; route visual-block entry through the existing semantic `piVimMode.keymap.commands.visualBlock` action.
- Keep visual block available through explicit keymap configuration, while all built-in presets leave paste shortcuts delegated to Pi by default.
- Update runtime diagnostics, docs, and tests so `:mapcheck ctrl+v` explains Pi ownership and the migration path for users who want Vim-style visual block on `Ctrl-v`.
- Non-goals: no direct dependency on `pi-image-tool`, no direct clipboard/image API call from pi-vimmode, no full Vim/Neovim parity, and no new keymap option family.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-mode-editor`: normal/visual-mode `Ctrl-v`, `Alt-v`, and `Ctrl-Alt-v` delegate to Pi by default so image paste handlers can run; visual-block entry remains supported through configured semantic bindings.
- `vim-keymap-configuration`: `commands.visualBlock` becomes the sole source of truth for visual-block keybindings, and protected `Ctrl-v` requires explicit opt-in when users bind it to pi-vimmode.
- `vim-customization-diagnostics`: protected shortcut metadata and `:mapcheck ctrl+v` explain image-paste ownership and any explicit override.
- `pi-vimmode-documentation`: feature and settings docs describe default `Ctrl-v` delegation plus the opt-in visual-block binding migration.

## Impact

- Affected code seams: `src/modal/engine.ts` normal/visual control-key routing, `src/customization.ts` protected shortcut catalog, `src/config.ts` preset/keymap validation if needed, `src/keymap-descriptors.ts`/semantic visual-block docs only if defaults change, and runtime help/diagnostic output that reads protected metadata.
- Tests: add modal regression coverage for normal-mode `Ctrl-v` delegation, visual-mode delegation where applicable, explicit `commands.visualBlock` override behavior, protected-key validation, empty preset visual-block behavior, and `:mapcheck ctrl+v` messaging.
- Docs/specs: update `docs/features.md`, `docs/settings.md`, and durable OpenSpec specs for Pi shortcut compatibility and visual-block key ownership.
- Dependencies: no new runtime or development dependencies.
- Compatibility: deliberate behavior change for default users who relied on built-in `Ctrl-v` visual block; they can configure a replacement binding or explicitly allow/bind `ctrl+v` where they prefer Vim ownership over image paste.
