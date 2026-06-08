## Why

`TODOS.md` tracks a cursor flickering issue seen while the agent is working. The likely cause is pi-vimmode enabling Pi's hardware cursor for bar-style insert mode, which makes the terminal cursor blink during frequent assistant/tool renders instead of staying quiet like Pi's default hidden hardware cursor path.

## What Changes

- Add an explicit terminal cursor lifecycle for pi-vimmode: interactive prompt editing may show the hardware cursor when needed for configured `bar` style, but agent-running output suppresses it to avoid flicker.
- Use Pi lifecycle events to mark tracked Vim editors busy on `agent_start`, restore the resolved cursor policy on `agent_end`, and reset safely on `session_shutdown` or `/vimmode off`.
- Keep the rendered fake cursor and existing cursor-shape hints width-safe, so normal, visual, search, and Ex render layers continue to compose.
- Add regression coverage for hardware cursor visibility transitions, repeated render churn, and lifecycle busy/idle transitions.
- Update `TODOS.md` only after implementation and validation pass.

### Non-goals

- No full Neovim cursor blink timing parity, cursor animation configuration, or terminal-specific negotiation.
- No Pi core patch unless existing public `TUI` and lifecycle APIs cannot express the fix.
- No change to modal editing semantics, prompt text, registers, search, Ex behavior, or keybindings.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-mode-visual-configuration`: Cursor style requirements gain explicit hardware-cursor visibility behavior so bar cursor support does not cause visible flicker during agent work.
- `vim-extension-lifecycle`: Lifecycle requirements gain agent busy/idle cursor coordination for tracked Vim editor instances.

## Impact

- Affected code seams: `src/vim-editor.ts` for terminal cursor visibility policy, `src/lifecycle.ts` for `agent_start`/`agent_end` coordination, and possibly `src/render.ts` if fake bar cursor rendering needs a width-safe fallback adjustment.
- Affected tests: focused `VimEditor` cursor tests, lifecycle hook tests, and render width-safety tests if rendering changes.
- Affected docs: `TODOS.md`; `docs/features.md` cursor limitations if user-facing cursor behavior changes.
- Dependencies: no new runtime or peer dependencies expected.
- Compatibility: no breaking changes; existing `piVimMode.cursor` values and defaults continue to work.
