## Why

`src/modal/engine.ts` now coordinates search, Ex command-line, visual behavior, macros, registers, marks, messages, and render state in long handlers, so modal changes are harder to review and diagnose than the prompt-local behavior warrants. The TODO-backed runway sprint adds focused architecture seams and runtime inspectability before the next wave of Ex/search/visual work deepens the same hotspots.

## What Changes

- Split modal feature behavior into focused modules for normal dispatch, prompt search, Ex command-line flow, visual operations, macro lifecycle, and inspect/message snapshots while preserving the existing `ModalEffect` adapter contract.
- Add golden modal effect tests that lock current semantic state/effect behavior before and after the module split.
- Add read-only prompt-local inspectability through `:vimmode inspect`, covering mode, cursor, selection, registers, marks, macros, search, Ex/workbench, and render-layer summaries.
- Add a bounded `:messages` diagnostic command backed by a message log that is separate from the current transient Ex row message.
- Keep existing prompt-editing behavior, keybindings, Pi shortcut delegation, settings, and public docs semantics unless explicitly covered by the new inspect/message commands.

### Non-goals

- No full Vim/Neovim parity, Vimscript, recursive mappings, or broad command dispatch.
- No new runtime dependencies, peer dependency changes, or settings-file edits.
- No full prompt text, register contents, or macro-token dumps in inspect/messages output; use summaries and previews only.
- No `/vimmode inspect` runtime command unless a later change adds active-editor state plumbing.

## Capabilities

### New Capabilities

- `vim-runtime-inspectability`: read-only prompt-local inspection and bounded message history for modal state, editor snapshot, and render/workbench summaries.

### Modified Capabilities

- `vim-editor-adapter-architecture`: require focused modal feature modules and golden semantic effect tests while keeping `VimEditor` as the Pi adapter and `ModalEffect` as the boundary.
- `vim-ex-command-line`: add finite parsing/execution of `:vimmode inspect` and `:messages` as read-only diagnostic Ex commands.
- `vim-customization-diagnostics`: extend diagnostic command behavior to include inspect/messages preservation guarantees and bounded output.

## Impact

- Code seams: `src/modal/engine.ts`, new `src/modal/*` feature modules, `src/modal/types.ts`, `src/modal/view.ts`, `src/ex.ts`, `src/vim-editor.ts`, and possibly `src/render.ts` for render summary data.
- Tests: add golden modal effect tests plus focused tests for inspect snapshots, message log behavior, Ex parser support, diagnostic read-only guarantees, and adapter smoke coverage.
- Docs/specs: update OpenSpec specs and `docs/features.md` for `:vimmode inspect` / `:messages`; README remains quickstart/index only unless links change.
- Dependencies: no new runtime dependencies or peer dependency changes.
- Compatibility: no breaking changes; existing keymap, settings, prompt-edit behavior, and Pi shortcut delegation remain unchanged.
