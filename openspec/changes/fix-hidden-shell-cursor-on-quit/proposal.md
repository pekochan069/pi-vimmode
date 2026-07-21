## Why

Exiting Pi from pi-vimmode insert mode can leave the shell hardware cursor hidden because extension cleanup restores Pi's captured `showHardwareCursor=false` policy after Pi has already stopped its TUI and shown the cursor. Cleanup must distinguish terminal exit from runtime session transitions so Pi retains ownership of final shell cursor visibility without weakening in-process cleanup.

## What Changes

- Split cursor cleanup behavior into runtime cursor cleanup and terminal-exit cursor cleanup.
- On `session_shutdown` with reason `quit`, reset terminal cursor shape without restoring the captured Pi hardware cursor visibility policy.
- Preserve existing visibility restoration for `/vimmode off` and runtime transitions (`reload`, `new`, `resume`, and `fork`).
- Add regression coverage for all shutdown reasons and for shape reset without a visibility mutation on quit.
- Correct cursor specifications so lifecycle ownership is explicit and insert-mode bar cursor visibility during agent work matches current canonical behavior.

### Non-goals

- Changing Pi's shutdown order or terminal implementation.
- Forcing the hardware cursor visible from pi-vimmode after Pi exits.
- Changing cursor configuration, modal behavior, or prompt rendering.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-extension-lifecycle`: Distinguish terminal-exit cleanup from runtime cleanup based on Pi's shutdown reason.
- `vim-mode-visual-configuration`: Keep an active insert-mode bar hardware cursor visible during agent work and align reset behavior with lifecycle ownership.

## Impact

- Code: `src/lifecycle.ts` and `src/vim-editor.ts` cursor cleanup seams.
- Tests: focused lifecycle reason routing and VimEditor cursor reset assertions.
- Specs/docs: lifecycle and visual cursor requirements; existing cursor-lifecycle glossary terms.
- Dependencies: no new runtime dependencies or peer changes.
- Compatibility: no breaking API or configuration changes; existing runtime cleanup behavior remains the default.
