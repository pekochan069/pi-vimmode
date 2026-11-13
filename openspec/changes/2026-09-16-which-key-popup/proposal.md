## Why

Configured leader mappings are useful only when users remember them. A compact, in-flow preview makes the available continuations visible without taking focus from the editor.

## What Changes

- Add opt-in `piVimMode.whichKey` settings with `enabled: false` by default and optional prefix labels.
- Render leader-only Normal-mode action hints below the editor.
- Collapse shared next-key prefixes and expand them as input continues.
- Support token-aware Backspace navigation while a leader sequence is pending.

## Non-goals

- Built-in Vim grammar hints, non-leader hints, delay timers, scrolling, and a capturing overlay.

## Capabilities

### New Capabilities

- `which-key-popup`: Configured leader mappings have an in-flow keybinding preview.

### Modified Capabilities

- `vim-keymap-configuration`: Trusted JavaScript and JSON accept which-key configuration.
- `pi-vimmode-documentation`: Settings document leader previews and prefix labels.

## Impact

Affected seams: option resolution, modal input, editor rendering, trusted JS declarations, docs, and focused Bun tests.
