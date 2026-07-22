## Why

Public trusted-config properties and actions currently span runtime metadata, declaration-only types, and hand-written docs, so additions can silently leave defaults, scopes, aliases, or accepted shapes undocumented. Issue #42 closes this drift gap now that canonical finite metadata (#35) and public declarations (#41) exist.

## What Changes

- Generate one committed property-reference block from canonical config metadata, with exactly one stable anchor per public leaf plus accepted shape, built-in default, assignment semantics, and JSON crosswalk where applicable.
- Generate one committed action-reference block from canonical action metadata, with exactly one stable anchor per public action plus supported mapping scopes, arguments, and compatibility aliases.
- Add deterministic regeneration and validation commands that fail on duplicate or missing metadata, unresolved generated anchors, or committed-output drift.
- Keep generated references compatible with declaration-only `pi-vimmode/config` types without adding runtime exports or a competing registry.
- Commit generated blocks in the canonical trusted JavaScript config guide so repository readers do not need a build step.
- Preserve practical Pi prompt-editing scope; no full Vim/Neovim parity is implied.

### Non-goals

- Writing the complete trusted-config setup, workflow, safety, discovery, or packaging guide tracked by issue #43.
- Changing config defaults, validation, keymap behavior, action availability, or public declaration semantics.
- Generating public TypeScript declarations or exposing metadata through a runtime API.
- Adding recursive mappings, Vimscript, Neovim Lua, or user-defined actions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-vimmode-documentation`: Require complete committed property/action references generated from canonical metadata, stable resolvable anchors, deterministic regeneration, and drift validation.

## Impact

- **Code seams:** Extend `src/config-metadata.ts` only as needed with documentation facts sourced from existing config/action owners; add a build-time generator under `scripts/` without changing runtime behavior.
- **Types:** Validate generated property and action coverage against `src/vim-config.d.ts`; declaration-only `pi-vimmode/config` contract remains unchanged.
- **Docs:** Add canonical trusted JavaScript config guide shell/reference blocks while keeping `docs/settings.md` authoritative for JSON behavior.
- **Tests:** Add focused metadata completeness, duplicate detection, stable-anchor resolution, deterministic generation, committed-output drift, and declaration compatibility checks.
- **Dependencies:** No new runtime or peer dependencies; use existing Bun/TypeScript tooling.
- **Compatibility:** Additive documentation/tooling change with no breaking config, keymap, or runtime behavior changes.
