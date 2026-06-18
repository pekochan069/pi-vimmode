## Why

Runtime help, diagnostic action, keybinding discovery, and action recipe modules currently carry docs/test-only metadata such as docs anchors, spec anchors, parser examples, and test anchors in the published runtime path. Moving that validation metadata out of runtime code reduces bundled bytes and package noise while keeping docs drift guards and public help behavior intact.

## What Changes

- Move docs/test-only metadata for runtime help entries, diagnostic actions, read-only popup command parser examples, and action keybinding recipe/preset anchors into test/dev-owned metadata where possible.
- Keep runtime registries lean: only fields needed for actual help, diagnostics, discovery, config, and popup output remain in runtime modules.
- Preserve public runtime behavior for `:help`, `:features`, `:keybindings`, `:actions`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`, and `:vimmode inspect`.
- Preserve docs drift guard coverage for feature-doc anchors, spec files, parser examples, bindability boundaries, and recipe/preset documentation.
- Add package/build verification so removed metadata does not remain in `dist/index.js` through an accidental runtime import.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `pi-vimmode-documentation`: Documentation drift guards must remain complete after docs/test-only metadata moves out of runtime modules, and runtime/distribution artifacts must not depend on that metadata for public help behavior.

## Impact

- Affected code seams: `src/runtime-help.ts`, `src/diagnostic-actions.ts`, `src/keybinding-discovery-popup.ts`, `src/action-keybinding-recipes.ts`, and likely a new test/dev metadata module used by drift tests.
- Affected tests: `test/docs-drift.test.ts`, `test/runtime-help.test.ts`, `test/diagnostic-actions.test.ts`, `test/keybinding-discovery-popup.test.ts`, `test/config.test.ts`, and package/build checks for runtime bundle contents.
- Affected docs/specs: no user-facing docs content should change unless wording is needed to keep anchors intact; `pi-vimmode-documentation` gets a delta requirement for metadata separation and drift-guard preservation.
- Dependencies/APIs: no new runtime dependencies and no public setting, command, action ID, or keybinding behavior changes.
- Compatibility: no breaking changes; this is an internal packaging and source-of-truth cleanup.

## Non-goals

- Do not remove public runtime help, feature discovery, keybinding discovery, diagnostic actions, recipe/preset discovery, or docs drift guards.
- Do not change supported Ex commands, parser behavior, popup behavior, keymap validation, or action bindability rules.
- Do not add full Vim help tags, runtime `:map`, runtime `:action`, plugin dispatch, or broad Vim/Neovim parity.
