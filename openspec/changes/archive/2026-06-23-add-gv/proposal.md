## Why

`gv` is common Vim muscle memory for returning to the last visual selection. pi-vimmode already has visual modes, but exiting visual mode discards selection state, forcing users to manually rebuild the same range.

## What Changes

- Add a normal-mode `gv` command that reselects the last visual range when available.
- Track the last completed/cancelled visual selection as mode, anchor, and active cursor.
- Preserve prompt-local safety: if no valid previous visual selection exists, `gv` is a no-op with existing invalid/unmapped feedback behavior.
- Expose `gv` through semantic keymap configuration as a finite command action.
- Document `gv` in feature and settings references.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-mode-visual-configuration`: add last visual selection capture and `gv` reselection behavior.
- `vim-keymap-configuration`: add semantic keymap support for the `gv` command action and default binding.
- `pi-vimmode-documentation`: document `gv` behavior and configuration.

## Impact

- Code seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/modal/types.ts`, `src/modal/state.ts`, `src/modal/core.ts`, `src/modal/normal.ts`, `src/modal/engine.ts`, and focused helpers if extraction keeps modal branches small.
- Tests: add modal state-machine tests for capture, reselection, invalid stale ranges, configured keymap binding, and visual-kind preservation.
- Docs: update `docs/features.md` and `docs/settings.md`.
- Dependencies: no new runtime or peer dependencies.
- Compatibility: no breaking changes; default `gv` adds a new normal-mode binding only.

## Non-goals

- No full Vim mark model for `'<`/`'>` outside existing visual Ex capture.
- No persistent selection history beyond one last visual selection.
- No reselection across prompt editor instances or after prompt text replacement outside normal modal state.
