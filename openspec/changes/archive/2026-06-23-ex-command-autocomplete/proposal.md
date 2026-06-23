## Why

`TODOs.md` calls out Ex command autocomplete, and current Ex input only accepts typed text plus history navigation. Vim-fluent users need a visible list of supported commands while typing `:` so they can discover the finite pi-vimmode command surface without guessing or opening docs first.

## What Changes

- Add bounded Ex command suggestions while Ex command-line mode is active, showing available exact commands that match the current command prefix.
- Keep suggestions read-only and prompt-local: no prompt-buffer edits, no full Vimscript completion engine, and no command execution until `Enter`.
- Support command completion for built-in Ex commands and enabled prompt transform Ex commands from `piVimMode.promptTransforms.commands`.
- Add keyboard behavior to apply a visible suggestion without taking over Pi insert-mode autocomplete.
- Update tests and docs for visible options, prefix filtering, custom transform commands, and unsupported-command scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-ex-command-line`: Adds visible finite Ex command suggestions and optional suggestion application while command-line mode is active.

## Impact

- Code seams: `src/ex.ts` for a reusable supported-command/suggestion source, `src/modal/ex-command-line.ts` and `src/modal/types.ts` for pending suggestion state and command-line key handling, `src/modal/view.ts`/`src/render.ts` or `src/vim-editor.ts` for width-safe suggestion display under the existing Ex row.
- Tests: parser/helper tests for suggestion candidates plus modal and live render tests for filtering, applying, visual-source Ex input, autocomplete row preservation, and custom prompt transform commands.
- Docs: `docs/features.md` and runtime help/docs drift checks as needed.
- Dependencies: no new runtime dependencies or peer dependency changes.
- Compatibility: no breaking changes; unsupported Ex commands still fail explicitly and existing Ex input/history/substitution preview behavior remains intact.

## Non-goals

- No full Vimscript, Neovim Lua, `wildmenu`, command abbreviations beyond commands already supported, file/path completion, shell completion, registers/ranges/arguments completion, recursive mappings, or runtime `:command` definitions.
- No new settings unless implementation proves one small keybinding/display toggle is required.
