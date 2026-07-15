## Why

pi-vimmode 0.9.0 needs a complete trusted JavaScript configuration contract, transactional live reload, package-backed documentation, and in-editor current-version release notes. Current behavior exposes only part of the finite settings and mapping surface, reload does not safely reconfigure active editors, and installed users cannot inspect validated release notes inside Pi.

## What Changes

- Add one staged trusted global JavaScript configuration API covering every finite `piVimMode` option through validated domain properties.
- Add opaque finite action descriptors and true normal, visual, insert, and operator-pending mapping scopes while preserving existing JavaScript and JSON configuration compatibility.
- Compile defaults, global JSON, JavaScript operations, and project JSON into one immutable plan before commit.
- Reconfigure active editors transactionally on successful reload, preserve durable prompt state, clear invalid transient grammar state, and reject stale async generations.
- Publish declaration-only config types, generated property/action references, checked examples, discovery links, and built-package drift checks.
- Add strict build/runtime release-note validation and manual Markdown `:changelog` display through existing read-only popup behavior.
- Add reproducible performance evidence and reusable built-package verification foundations for 0.9.0.
- Keep the release additive: existing JSON settings, `vim.g.mapleader`, `vim.prompt.*`, and three-argument `vim.keymap.set` remain valid.
- Defer cursor-setter migration, final render optimization, and release-candidate verification until Pi ships the required public normalized logical cursor setter.

### Non-goals

- Full Vim/Neovim parity, Vimscript, Neovim Lua, recursive mappings, mapping timeouts, arbitrary callbacks, or broad insert-mode remapping.
- Project-local JavaScript config, sandboxing, watchers, or imported-helper hot reload.
- Automatic changelog notices, historical release browsing, network-loaded notes, or a general Markdown viewer.
- Private Pi cursor state, a slow cursor fallback, speculative caches, or native core work.

## Capabilities

### New Capabilities

- `vim-trusted-javascript-configuration`: Complete finite trusted JavaScript option/action API, staged evaluation, cross-layer compilation, compatibility, and public type contract.
- `vim-release-notes-popup`: Validated packaged current-version release notes and manual Markdown `:changelog` popup behavior.

### Modified Capabilities

- `vim-keymap-configuration`: Add true mapping scopes, finite action descriptors, deterministic scoped conflicts/unmapping, and cross-layer precedence.
- `vim-extension-lifecycle`: Apply successful reloads transactionally to active editors with generation ordering and last-known-good fallback.
- `vim-ex-command-line`: Recognize and dispatch the finite `:changelog` command without broadening Ex parsing.
- `pi-vimmode-documentation`: Add canonical generated config reference, checked workflows, discovery links, public declarations, and package-content drift gates.

## Impact

- Affected seams: config parsing and types, finite action metadata, keymap compilation, lifecycle refresh, editor reconfiguration, Ex dispatch, read-only popup rendering, build asset generation, package exports, documentation generation, examples, and package smoke tests.
- Runtime dependency impact: no new runtime dependencies. Package version moves to 0.9.0 without publishing in this change.
- Compatibility: additive for existing valid JSON and JavaScript configuration. Deprecations, if introduced later, require at least one minor release warning; breaking trusted-config changes require a major release.
- Delivery mapping: implementation tasks map to GitHub issues #33–#45. Upstream-Pi-dependent cursor and final release tasks remain deferred and are not part of this change's apply-ready task set.
