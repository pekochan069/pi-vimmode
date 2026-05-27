## Why

`VimEditor` now mixes Pi `CustomEditor` integration, modal state, Vim command dispatch, rendering/status, register handling, and terminal cursor effects in one class. Splitting Pi adapter concerns from a modal editing module makes future Vim behavior safer to add while preserving current prompt editing behavior.

## What Changes

- Introduce an explicit Pi adapter boundary around the existing `VimEditor extends CustomEditor` integration.
- Extract modal editing state, key handling, command execution, and transient state transitions into a testable modal editing module.
- Replace direct Pi calls inside Vim semantics with typed effects/intents that the adapter applies.
- Keep existing keymap, mode behavior, visual behavior, settings, terminal cursor behavior, and Pi shortcut delegation unchanged.
- Add focused unit coverage for modal engine behavior independent from Pi editor lifecycle.
- Update architecture documentation to explain adapter/module split and refactor non-goals.

## Capabilities

### New Capabilities

- `vim-editor-adapter-architecture`: Defines the Pi adapter and modal editing module boundary, effect contract, behavior parity, and validation expectations for future Vim editor work.

### Modified Capabilities

None. This change refactors architecture and test seams without changing user-facing Vim editing requirements.

## Impact

- Affected code: `src/vim-editor.ts`, likely new modal module files under `src/`, existing `src/commands.ts`, `src/buffer.ts`, `src/render.ts`, and tests under `test/`.
- Affected docs: README or architecture/design documentation describing module boundaries and non-goals.
- Public API: no breaking changes; `VimEditor` class remains the Pi-facing editor implementation.
- Dependencies: no new runtime dependencies expected.
