## Why

Insert-mode `/` and `@` completions can render over the pi-vimmode status border that shows `INSERT`. When the completion popup has only one visible row, the user can lose the only visible mode cue and the completion UI feels broken.

## What Changes

- Keep Vim mode status feedback visible while Pi autocomplete or slash-command completion is open.
- Preserve Pi-owned insert-mode autocomplete navigation, selection, and insertion behavior.
- Ensure single-row and multi-row completion popups do not collide with the pi-vimmode status row.
- Add regression coverage for insert-mode completion rendering with status UI enabled.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-mode-editor`: Strengthen insert-mode autocomplete and mode-feedback requirements so completion UI and Vim status feedback remain visible together.

## Impact

- Affected code seams: `src/vim-editor.ts` render path, status-row composition via `modalStatus`, and any autocomplete/open-state handling exposed by the `CustomEditor` adapter.
- Tests: add focused live `VimEditor` render tests for autocomplete-open insert mode and default status visibility; keep existing width-safety tests passing.
- Docs: update user-facing docs only if the visible behavior or limitation changes.
- Dependencies: no new runtime dependencies and no peer/runtime dependency changes.
- Compatibility: no breaking changes; insert-mode input remains Pi-owned and existing `piVimMode.ui` status configuration remains the status source of truth.

## Non-goals

- Replacing Pi's autocomplete implementation.
- Adding Vimscript, Vim popup-menu semantics, or new completion keybindings.
- Introducing a second status configuration surface outside `piVimMode.ui`.
