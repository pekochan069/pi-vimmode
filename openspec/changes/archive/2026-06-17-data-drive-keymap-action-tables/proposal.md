## Why

Keymap/action names and default bindings are repeated across config defaults, validation allow-lists, command resolver legacy maps, tests, and docs-facing diagnostics. Deriving those surfaces from shared descriptors reduces bundle/source size and prevents future keymap drift while preserving existing finite Vim prompt-editing behavior.

## What Changes

- Introduce shared typed descriptors for built-in operators, motions, commands, text-object groups, macro/mark prefixes, and default key sequences where practical.
- Derive default keymap entries, validation sets, legacy action maps, and resolver reverse maps from those descriptors instead of maintaining separate hand-written tables.
- Preserve existing `piVimMode.keymap` behavior, protected shortcut validation, finite non-recursive parsing, diagnostics, and documented default bindings.
- Add equivalence tests so descriptor-derived outputs match current default bindings and command-resolution behavior.
- Non-goals: no new Vim actions, no recursive mappings, no timeout behavior, no full Vimscript/Neovim parity, and no runtime dependency changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-keymap-configuration`: Clarify that built-in semantic keymap metadata may be descriptor-derived while resolved defaults, validation, protected shortcut handling, command resolution, diagnostics, and docs-facing behavior remain equivalent.

## Impact

- Affected code: `src/config.ts`, `src/commands.ts`, and type definitions if descriptor types need to be shared.
- Tests: add or update config/command tests for descriptor/default equivalence, legacy action map equivalence, configurable binding behavior, conflicts, and invalid fallback.
- Docs/specs: update OpenSpec requirements only; user docs should not need content changes unless implementation reveals a docs drift guard tied to moved metadata.
- Dependencies: no new runtime or peer dependencies.
- Compatibility: no breaking changes; existing settings and default keybindings must keep working.
