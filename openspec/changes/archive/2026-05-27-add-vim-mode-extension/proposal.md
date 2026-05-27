## Why

`pi-vim` proves modal editing is possible in Pi, but current behavior is incomplete for daily use, especially missing visual mode and richer normal-mode edits. A first-party `pi-vimmode` extension should provide a dependable Vim-style prompt editor while preserving Pi application shortcuts.

## What Changes

- Add a Pi extension entrypoint that replaces the main input editor with a `CustomEditor`-based Vim editor.
- Add insert, normal, and characterwise visual modes with visible mode/status feedback.
- Add core normal-mode movement and editing commands: `h/j/k/l`, `0`, `$`, `w`, `b`, `i`, `a`, `I`, `A`, `x`, `dd`, `yy`, `p`, `u`.
- Add visual-mode selection operations: `v`, motion extension, `y`, `d`/`x`, `c`, and `Esc` cancel.
- Preserve Pi app/editor behavior for insert mode and core shortcuts such as submit, interrupt, clear, exit, external editor, model/thinking shortcuts, and autocomplete.
- Add tests for command parsing and pure text-buffer transformations.
- Replace starter README with usage, keymap, install, test, and known-limitation docs.

## Capabilities

### New Capabilities
- `vim-mode-editor`: Pi prompt editor replacement that provides Vim-style insert, normal, and visual editing while remaining compatible with Pi app shortcuts.

### Modified Capabilities

## Impact

- Adds extension source under `src/`, tests under `test/`, and package metadata needed for Pi extension loading.
- Uses Pi runtime APIs from `@earendil-works/pi-coding-agent` and TUI helpers from `@earendil-works/pi-tui`.
- Keeps runtime dependency footprint minimal; Bun remains the local test/typecheck runner.
- Affects only this extension package; no changes to Pi core are planned.
