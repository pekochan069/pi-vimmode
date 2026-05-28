schema: spec-driven
created: 2026-05-28

## Why

pi-vimmode has strong unit coverage, but some user-visible behavior contracts have drifted between README, OpenSpec specs, and the actual `VimEditor` adapter. Hardening those contracts now reduces risk before adding larger prompt-buffer features such as prompt search or command mode.

## What Changes

- Correct documentation drift so supported counts, text objects, line-local character search, and dot-repeat limitations match current behavior.
- Preserve mark configuration through the actual `VimEditor` adapter, not only through modal-engine tests.
- Tighten dot-repeat semantics for documented completed line edit commands, including line deletes.
- Add a test-only real-editor scenario harness that exercises behavior through `VimEditor` while keeping focused modal-engine tests for locality.
- Allow only existing-contract gaps in this change; prompt search and command mode remain out of scope.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-editor-adapter-architecture`: Add real-editor scenario coverage as a behavior-contract backstop without introducing a new production seam.
- `vim-marks`: Require configured mark behavior to survive construction through the actual `VimEditor` adapter.
- `extended-vim-keybindings`: Clarify and validate dot-repeat for documented completed line edit commands and align README limitations with supported keybinding behavior.

## Impact

- Affected code: `src/vim-editor.ts`, `src/modal/engine.ts`, test helpers under `test/`, and `README.md`.
- No breaking changes.
- No new runtime dependencies.
- No new Vim feature scope except fixing behavior already implied by docs/spec/config contracts.
