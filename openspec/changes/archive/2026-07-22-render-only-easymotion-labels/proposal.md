## Why

EasyMotion currently treats transient jump labels as prompt edits, so opening or cancelling it can clear redo history, pollute undo behavior, and risk exposing label text when an exit path misses restoration. This is a release blocker because presentation state must never own or rewrite prompt content.

## What Changes

- Render EasyMotion labels as transient visual substitutions over unchanged prompt cells.
- Keep only label and coordinate metadata in modal state; remove prompt snapshots and restoration-only target data.
- Make highlight entry, cancellation, invalid labels, and successful selection avoid text-edit effects.
- Preserve cursor movement on valid selection while keeping undo and redo history intact.
- Add focused modal, renderer, and live-editor regressions for visual-only labels, configured label color, cancellation, selection, invalid input, multiline targets, label limits, and undo/redo preservation.
- Remove the unreachable EasyMotion `jump` state when no constructor remains.
- Correct user-facing EasyMotion documentation to describe its opt-in command, prompt-wide targeting, and render-only labels.

Non-goals:

- Fixing repeated `,` character-search direction behavior.
- Adding a default EasyMotion binding or changing its command/config surface.
- Expanding beyond the existing 52 labels or pursuing full Vim/Neovim EasyMotion parity.
- Reworking modal, render, or editor-adapter architecture.

## Capabilities

### New Capabilities

- `vim-easymotion`: Defines prompt-local EasyMotion targeting, render-only labels, safe cancellation/invalid input, cursor movement, label limits, color rendering, and undo/redo preservation.

### Modified Capabilities

None.

## Impact

- Code seams: `src/modal/engine.ts`, `src/modal/types.ts`, `src/vim-editor.ts`, and `src/render.ts`.
- Tests: focused modal-effect, render, and live `VimEditor` integration coverage; manual terminal verification remains required before release.
- Documentation: correct `docs/features.md` and README wording; no command or setting contract changes.
- APIs and compatibility: no breaking changes; existing opt-in EasyMotion bindings and `piVimMode.easymotion.labelColor` remain compatible.
- Dependencies: no new runtime, peer, or development dependencies.
