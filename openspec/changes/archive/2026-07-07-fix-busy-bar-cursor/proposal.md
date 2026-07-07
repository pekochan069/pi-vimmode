## Why

Issue #11 reports that the bar cursor disappears while Pi agent work is active. This makes insert-mode prompt position hard to see exactly when the user is waiting and likely to resume editing afterward.

## What Changes

- Keep a configured `bar` hardware cursor visible while the agent is busy.
- Continue hiding non-bar hardware cursors during agent work to avoid block/underline cursor clutter over streaming output.
- Preserve prompt text, cursor position, Vim mode, terminal cursor-shape hints, and existing busy/idle lifecycle behavior.
- Update tests and user-facing behavior docs for the busy-state cursor policy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-extension-lifecycle`: Agent busy cursor policy changes from suppressing every hardware cursor to suppressing only non-bar hardware cursors.

## Impact

- Code seams: `src/vim-editor.ts` cursor visibility policy; possibly `src/lifecycle.ts` tests if lifecycle expectations need adjustment.
- Tests: focused `test/vim-editor.test.ts` coverage for busy/idle cursor visibility with bar and non-bar styles; preserve existing lifecycle coverage.
- Docs: `docs/features.md` lifecycle/runtime behavior note.
- Dependencies: no new runtime or peer dependencies.
- Compatibility: no breaking settings or API changes; existing `piVimMode.cursor` values keep working.

## Non-goals

- No new cursor style settings.
- No terminal-specific cursor negotiation or blink behavior.
- No broader rendering rewrite for fake cursor styling.
