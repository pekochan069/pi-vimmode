## Why

`TODOS.md` tracks macro support as a remaining Vim-parity gap. Prompt editing now has a separated modal engine and buffer helpers, so macro recording can be added without pushing more behavior into the Pi adapter.

## What Changes

- Add in-memory macro recording for normal-mode `q{slot}` and stop recording with `q` from normal mode.
- Add macro playback with `@{slot}` and repeat-last playback with `@@`.
- Add configuration for macro record/play keys, enabled state, allowed slots, and replay step cap.
- Record replayable Vim editor inputs across normal, insert, visual, and visual-line modes while excluding macro control keys and Pi-delegated application shortcuts.
- Store macros in extension-local slots independent of the unnamed yank/delete register; full named edit registers remain out of scope.
- Guard playback against recursion, missing slots, and runaway replay.
- Show recording/playback state in Vim status feedback where status UI is enabled.
- Document supported macro keys, limitations, and validation commands.
- Add parser, modal-engine, adapter/integration, and README coverage for macro recording and playback.

## Capabilities

### New Capabilities

- `vim-macro-recording`: Recording, stopping, replaying, repeating, status feedback, safety limits, documentation, and validation for Vim-style prompt macros.

### Modified Capabilities

- None

## Impact

- Affected code: `src/types.ts`, `src/commands.ts`, `src/modal/*`, `src/vim-editor.ts`, `src/config.ts`.
- Affected tests: command parsing tests, modal state/effect tests, Vim editor integration tests, and status/view tests.
- Affected docs: README normal-mode keymap, registers/undo section, limitations, and `TODOS.md` after implementation is complete.
- No dependency or public package API changes expected.
