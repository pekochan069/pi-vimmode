## Why

Vim-fluent pi-vimmode users expect `:` commands for prompt-wide edits, especially substitutions like `:%s/old/new/g`. pi-vimmode already has modal editing, search, ranges, visual modes, macros, and configurable keymaps, so Ex substitution is the next high-leverage prompt-editing gap.

## What Changes

- Add Ex command-line mode entered from normal and visual modes with `:`.
- Render Ex command input and transient Ex messages in a dedicated row below the prompt box, shrinking the prompt viewport while visible.
- Implement literal Ex substitution via `:s` and `:substitute` with current-line, `%`, visual `'<,'>`, numeric, `.`, and `$` ranges.
- Support substitution flags `g` and `i`, literal delimiter/backslash escapes, empty replacement, pattern-not-found errors, and success counts.
- Keep v1 intentionally narrow: no regex patterns, no full command-line editor, no command history/repeat, no offset/semicolon ranges, and no non-substitution Ex commands.
- Preserve insert-mode Pi ownership, normal-mode register semantics, prompt search state boundaries, and macro replay consistency.

## Capabilities

### New Capabilities

- `vim-ex-command-line`: Ex command-line mode, Ex range parsing, literal Ex substitution, dedicated Ex row, and Ex messages.

### Modified Capabilities

- `vim-keymap-configuration`: add semantic keymap support for the Ex command-line entry action.
- `vim-macro-recording`: ensure Ex command-line keystrokes are recorded and replayed through the existing macro model.
- `vim-ui-configuration`: keep the dedicated Ex row and prompt viewport behavior width-safe alongside existing status, visual, and search UI.

## Impact

- Affected code: `src/modal/engine.ts`, `src/modal/types.ts`, `src/modal/view.ts`, `src/vim-editor.ts`, `src/render.ts`, `src/buffer.ts`, `src/commands.ts`, `src/config.ts`, `src/types.ts`.
- Affected tests: modal/parser tests, buffer substitution tests, render/vim-editor row tests, keymap config tests, macro recording/replay tests.
- Affected docs: README keymap/settings docs and OpenSpec capability specs.
- No breaking changes expected; insert mode and Pi-owned shortcuts remain delegated.
