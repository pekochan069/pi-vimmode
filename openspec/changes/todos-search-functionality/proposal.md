## Why

`TODOS.md` tracks `/` search as a remaining Vim-parity gap. Prompt editing already has modal state, cursor movement, command parsing, and tested buffer helpers, so forward/backward in-buffer search can be added without changing Pi core APIs.

## What Changes

- Add normal-mode `/` search prompt support that collects a query and jumps to next match in the current prompt buffer.
- Add repeat search commands (`n`, `N`) that reuse the last query and direction.
- Add safe no-op behavior for empty, cancelled, or missing-match searches.
- Add visual/operator motion integration where search can extend selections or provide motion ranges when feasible within existing modal architecture.
- Update README keymap/limitations and mark `/` search complete in `TODOS.md` only after implementation and validation pass.

## Capabilities

### New Capabilities

- `vim-search`: Vim-style prompt-buffer search behavior for `/`, repeat navigation, and integration with normal, visual, and operator-pending modes.

### Modified Capabilities

## Impact

- Affected code: `src/types.ts`, `src/commands.ts`, `src/modal/*`, `src/buffer.ts`, `src/vim-editor.ts`, and possibly render/status helpers for search prompt or feedback.
- Affected tests: command parsing tests, modal state/effect tests, buffer search/range tests, Vim editor integration tests, and visual/operator tests.
- Affected docs: README normal-mode keymap, limitations, validation notes, and `TODOS.md` after implementation is complete.
- No dependency, Pi core, or public package API changes expected.
