## Why

Trusted JavaScript config now has a complete finite runtime API, but package consumers cannot type root configs or imported helpers against that API. Issue #41 unblocks editor validation and later generated config documentation by publishing declarations proven from built package, without creating runtime helper surface.

## What Changes

- Export declaration-only `pi-vimmode/config` package subpath with guaranteed `VimConfig` and `VimConfigApi` types.
- Type synchronous and asynchronous default-export config functions plus root and imported helper/preset session parameters.
- Add basic JavaScript config example that uses public JSDoc type, loads through real trusted config loader without warnings, and typechecks unchanged.
- Extend built-package inventory and temporary-consumer checks to resolve subpath under TypeScript Bundler and NodeNext modes.
- Land declaration and export-map changes atomically, with no runtime module for config subpath.

### Non-goals

- Runtime config helpers such as `defineConfig`, descriptor constructors, action registries, or runtime `pi-vimmode/config` imports.
- Complete config guide, generated references, full example suite, or negative type fixtures owned by follow-up issues #42 and #43.
- Changes to trusted config evaluation, validation, keymap behavior, reload, or existing JSON configuration.
- Full Vim/Neovim configuration parity.

## Capabilities

### New Capabilities

- `vim-trusted-javascript-configuration`: Public declaration-only typing contract for trusted JavaScript root configs and imported helpers, verified against built package.

### Modified Capabilities

None.

## Impact

- Affected seams: trusted config public type definitions, Rolldown package generation, generated `dist/package.json` export map and inventory, checked examples, real-loader tests, and reusable temporary package consumers.
- Public API: adds type-only `pi-vimmode/config`; existing runtime and configuration APIs remain unchanged.
- Tests: add unchanged-example runtime/type checks and built-package Bundler/NodeNext resolution checks.
- Dependencies: no new runtime dependencies and no peer dependency changes; existing TypeScript tooling performs declaration and consumer checks.
- Compatibility: additive, non-breaking change. No publish operation included.
