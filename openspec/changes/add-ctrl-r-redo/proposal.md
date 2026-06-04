## Why

Normal mode already supports `u` by delegating to Pi undo, but users cannot redo an accidentally undone prompt edit without leaving Vim flow. `Ctrl+R` is the expected Vim redo key and is the next small parity win from the TODO roadmap.

## What Changes

- Add normal-mode `Ctrl+R` redo as a finite Vim command.
- Delegate redo through the Pi editor adapter when Pi exposes a redo-capable editor input path, preserving prompt-local undo history semantics.
- Keep insert mode and unrelated Pi application shortcuts delegated to Pi unless pi-vimmode explicitly owns the shortcut.
- Expose redo through semantic keymap configuration alongside undo, with default binding `ctrl+r`.
- Document redo behavior, shortcut ownership, and current limitations.

### Non-goals

- No full Vim undo tree, redo count support, `:redo`, `g-`/`g+`, or persistent undo history.
- No extension-local prompt history stack unless Pi lacks a viable redo input path during implementation.
- No changes to submitted-session history or app-level session tree behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-mode-editor`: add normal-mode redo behavior as the counterpart to existing undo delegation.
- `vim-keymap-configuration`: add semantic command/default mapping coverage for redo and clarify explicit `Ctrl+R` ownership.

## Impact

- Code seams: `src/types.ts`, `src/config.ts`, `src/commands.ts`, `src/modal/types.ts`, `src/modal/engine.ts`, and `src/vim-editor.ts`.
- Tests: command/config parsing, modal normal-mode redo handling, protected shortcut delegation, and live `VimEditor` adapter command tests.
- Docs: `docs/features.md` and `docs/settings.md`.
- Dependencies: no new runtime or peer dependencies expected.
- Compatibility: no breaking changes; normal-mode `Ctrl+R` becomes explicitly owned by pi-vimmode, while insert mode remains Pi-owned.
