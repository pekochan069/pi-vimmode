## Why

The read-only popup model and scroll behavior have outgrown their keybinding-discovery module: generic runtime help, customization diagnostics, `:messages`, and `:vimmode inspect` now share a popup contract that still lives in `src/keybinding-discovery-popup.ts`. That misplaced interface creates an import cycle through modal inspect/types and makes future popup cleanup harder than the behavior warrants.

## What Changes

- Extract the generic read-only popup contract and pure popup helpers into a focused shared module such as `src/read-only-popup.ts`.
- Move shared popup state/types, body row constant, message splitting, popup creation helper, and scroll clamping out of keybinding-discovery content code.
- Keep source-backed popup content builders for runtime help, customization diagnostics, keybinding discovery, messages, and inspect output behavior-compatible.
- Rewire modal state/effects, overlay rendering, and popup-backed command builders to import the shared popup contract instead of importing through a feature-content module.
- Remove the current popup-related import cycle between `src/keybinding-discovery-popup.ts`, `src/modal/inspect.ts`, and `src/modal/types.ts`.
- Add focused tests for shared popup helpers and preserve existing read-only popup command behavior.
- No user-facing command, setting, or docs behavior changes.

### Non-goals

- No new read-only popup commands or settings.
- No Vim help pager, full Vimscript, `.vimrc`, Neovim Lua, recursive mappings, plugin API, or command palette.
- No change to `:help`, `:features`, `:keybindings`, `:actions`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`, or `:vimmode inspect` output semantics beyond internal ownership.
- No performance tuning without a measured bottleneck.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-editor-adapter-architecture`: Add an architecture requirement that generic read-only popup contracts live behind a shared popup seam and feature modules avoid popup-related import cycles.
- `vim-runtime-inspectability`: Clarify that popup-backed inspectability output uses the shared read-only popup contract while retaining bounded, redacted, prompt-local behavior.

## Impact

- Affected code seams:
  - `src/read-only-popup.ts` or equivalent new shared module: owns `ReadOnlyPopup`, `ReadOnlyPopupSource`, body row constant, split/build helpers, and scroll clamping.
  - `src/keybinding-discovery-popup.ts`: keeps source-backed content builders and imports the shared popup contract instead of defining it.
  - `src/modal/types.ts`: imports the popup type from the shared popup seam.
  - `src/keybinding-discovery-overlay.ts`: imports popup type, body row constant, and scroll helper from the shared popup seam.
  - `src/modal/engine.ts`: uses the shared scroll helper for modal-owned popup state when needed.
- Tests:
  - Add or update focused popup helper tests for message splitting and scroll clamping.
  - Keep existing modal, overlay, inspectability, docs-drift, and live editor tests behavior-compatible.
  - Add an import-cycle guard if no existing project check catches the current cycle.
- Docs:
  - No user-facing docs expected because command behavior is unchanged.
  - OpenSpec architecture/runtime requirements document the ownership cleanup.
- Dependencies:
  - No new runtime dependencies.
  - No peer/runtime dependency changes.
- Compatibility:
  - No breaking changes.
  - Existing read-only popup commands, controls, fallback behavior, and prompt-state preservation remain unchanged.
