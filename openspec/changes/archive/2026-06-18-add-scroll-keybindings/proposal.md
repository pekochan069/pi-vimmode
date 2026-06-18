## Why

Long prompts can exceed the visible editor window, and normal-mode users need a Vim-native way to move through them without leaving home-row flow. Add minimal scroll-style bindings now because the editor already has counted motions, viewport-aware rendering, and semantic keymap plumbing.

## What Changes

- Add normal/visual-mode Vim-style half-page scroll motions for `<C-d>` and `<C-u>`.
- Move the cursor down/up by a viewport-derived half-page amount, clamped to prompt bounds, so the visible editor scrolls naturally through long prompts.
- Expose the new motions through semantic keymap configuration and runtime keybinding discovery.
- Keep insert mode Pi-owned: `<C-d>` and `<C-u>` continue to delegate to Pi/default editor behavior outside Vim normal/visual handling.
- Add tests and user docs for default behavior, counts, edge clamping, protected-shortcut ownership, and configuration.

## Non-goals

- No full Vim scroll parity in this change: `<C-f>`, `<C-b>`, `zz`, `zt`, `zb`, scrolloff, and smooth viewport-only scrolling stay deferred.
- No new viewport state model; scrolling follows cursor movement and existing render behavior.
- No new runtime dependencies.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `extended-vim-keybindings`: add prompt-local scroll-style navigation bindings for long prompts.
- `vim-keymap-configuration`: add semantic keymap support and protected-shortcut ownership rules for the new scroll motions.

## Impact

- Code seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/commands.ts`, `src/modal/normal.ts`, `src/modal/core.ts`, and focused prompt-buffer navigation helpers in `src/buffer.ts` if needed.
- Tests: add command/keymap parser coverage plus modal/editor behavior tests for `<C-d>` and `<C-u>` in normal and visual modes.
- Docs: update `docs/features.md` and `docs/settings.md`; runtime keybinding discovery should list the new motions through existing catalog generation.
- Dependencies: no new runtime dependencies or peer dependency changes.
- Compatibility: normal-mode `<C-d>` becomes Vim-owned for scroll-down; insert mode and other Pi-owned shortcuts remain delegated.
