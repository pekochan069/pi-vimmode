## Why

Users can inspect some customization data through `:features keybindings`, `:keymap`, and `:actions`, but there is no obvious dedicated UI for seeing all effective keybindings from inside pi-vimmode. A first-class `:keybindings` command makes discovery direct, popup-backed like `:help`, and configurable as a normal-mode shortcut without implying full Vim `:map` or help-tag parity.

## What Changes

- Add a finite read-only `:keybindings` Ex command that opens a bounded popup showing all effective pi-vimmode bindings grouped by category.
- Add `:keybindings <query>` for a more detailed filtered view by key, action ID, description, command name, category, or protected shortcut.
- Add a configurable normal-mode semantic command for opening the keybindings popup, with no default binding and normal protected-shortcut/conflict validation.
- Reuse existing keymap/action/protected-shortcut metadata and popup UI so output stays source-backed, width-safe, scrollable, and prompt-state-preserving.
- Update runtime help, diagnostics, docs, specs, and drift-guard coverage for the new command and configurable shortcut.
- No removals and no breaking changes.

Non-goals:

- No runtime `:map`, recursive mappings, `.vimrc`, Vimscript, Neovim Lua, plugin action API, or command palette.
- No default keybinding for the new popup command.
- No keybinding dispatch for existing metadata-only diagnostic/help IDs such as `vimmode.help` or `vimmode.keymap`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-ex-command-line`: add finite parser/execution support for `:keybindings` and `:keybindings <query>` as read-only popup commands.
- `vim-customization-diagnostics`: add source-backed keybinding catalog/detail output while preserving existing diagnostic boundaries and metadata-only non-bindable actions.
- `vim-keymap-configuration`: add a configurable semantic command for opening the keybindings popup, with no default binding and existing validation/conflict rules.
- `runtime-help-drift-guard`: validate new popup command coverage across parser metadata, docs, specs, tests, and drift guard expectations.
- `pi-vimmode-documentation`: document the dedicated keybindings popup, query behavior, config path, and non-goals in user-facing docs/settings references.

## Impact

- Code seams: `src/types.ts`, `src/config.ts`, `src/commands.ts`, `src/ex.ts`, `src/customization.ts`, `src/runtime-help.ts`, `src/keybinding-discovery-popup.ts`, `src/modal/engine.ts`, `src/modal/ex-command-line.ts`, and `src/vim-editor.ts` if live option cloning or popup effects need propagation.
- Tests: parser/runtime popup tests, customization helper tests, modal/read-only state preservation tests, config validation tests, live editor option propagation tests, and docs/drift guard tests.
- Docs: `docs/features.md`, `docs/settings.md`, and any runtime-help drift validation fixtures.
- Dependencies: no new runtime, peer, or dev dependencies expected.
- Compatibility: additive command and optional keymap field; no breaking changes to existing settings or keybindings.
