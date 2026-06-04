## Why

Custom keybindings and Pi shortcut interactions are powerful but opaque: users see `vim ⚠`, silent no-ops, or protected binding failures without a clear path to understand or fix them. This change makes pi-vimmode self-explaining at runtime so customization is safe, discoverable, and prompt-local without drifting into full Vim/Neovim parity.

## What Changes

- Add compact diagnostic Ex commands: `:vimdoctor`, `:keymap`, `:mapcheck`, and `:actions`.
- Explain protected Pi shortcuts and keymap conflicts using runtime-visible messages instead of hidden settings warnings only.
- Add curated customization presets: `minimal`, `prompt-safe`, and `vim-heavy`.
- Add optional no-op feedback for confusing ignored inputs while keeping default behavior quiet.
- Introduce shared customization metadata so keymap validation, runtime diagnostics, docs, and tests use one vocabulary.
- Update user-facing docs for customization workflows, presets, diagnostics, and protected shortcut behavior.

Non-goals:

- No `.vimrc`, recursive mapping engine, Vimscript, Neovim Lua, or full interactive command palette.
- No broad Pi shortcut takeover beyond shortcuts explicitly owned by pi-vimmode.
- No multi-line help pager or large runtime help system in this change; Ex command output stays compact and width-safe.

## Capabilities

### New Capabilities

- `vim-customization-diagnostics`: Runtime customization introspection, diagnostic commands, protected shortcut explanations, curated presets, and optional no-op feedback.

### Modified Capabilities

- `vim-keymap-configuration`: Keymap behavior gains introspection, map-checking, preset resolution, and explainable protected shortcut handling.
- `vim-ex-command-line`: Ex command-line behavior gains read-only diagnostic commands that report customization state without editing prompt text.
- `vim-ui-configuration`: Transient runtime messages may include non-Ex informational/no-op feedback when enabled and remain width-safe.
- `pi-vimmode-documentation`: Feature and settings docs cover customization diagnostics, presets, protected shortcuts, and troubleshooting workflows.

## Impact

- Affected code seams: `src/config.ts`, `src/types.ts`, `src/commands.ts`, `src/ex.ts`, `src/modal/engine.ts`, `src/modal/types.ts`, `src/modal/view.ts`, `src/vim-editor.ts`, and `src/lifecycle.ts`.
- New pure metadata/helper seam expected for customization/action/protected shortcut catalog logic.
- Tests affected: config parsing and preset merge tests, Ex parser tests, modal execution tests, live editor rendering tests, lifecycle diagnostics propagation tests, and focused helper tests.
- Docs affected: `docs/features.md`, `docs/settings.md`, and possibly a compact ADR if source-of-truth policy changes.
- No new runtime dependencies expected.
- No breaking changes expected; invalid new settings must warn and ignore only invalid fields while preserving valid siblings.
