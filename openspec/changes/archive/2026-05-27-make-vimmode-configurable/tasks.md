## 1. Config Model and Parsing

- [x] 1.1 Extend `src/types.ts` with `VimKeymapOptions`, `ResolvedVimKeymap`, `VimUiOptions`, `ResolvedVimUi`, and `VimOptionsAliases` types.
- [x] 1.2 Add default keymap, UI, and Vim option alias values alongside existing `DEFAULT_VIM_OPTIONS` without changing current defaults.
- [x] 1.3 Extend `src/config.ts` to parse and deep-merge `piVimMode.keymap`, `piVimMode.ui`, and `piVimMode.vimOptions` from global and project settings.
- [x] 1.4 Add field-level validation warnings for invalid keymap actions, protected keys, duplicate mappings, invalid UI items, invalid labels, invalid cursor position format, and invalid Vim option aliases.
- [x] 1.5 Add config tests for defaults, global/project precedence, partial overrides, invalid nested fallback, protected shortcut rejection, and legacy `startMode`/`cursor` compatibility.

## 2. Semantic Keymap Resolution

- [x] 2.1 Replace hard-coded operator and motion sets in `src/commands.ts` with a resolver that maps configured key sequences to semantic operators, motions, commands, and pending prefixes.
- [x] 2.2 Implement finite sequence matching for single-key and multi-key bindings without recursive mappings or timeout behavior.
- [x] 2.3 Support configured operator-motion matrices and disabled operator-motion combinations.
- [x] 2.4 Add parser/resolver tests for default mappings, remapped operators, remapped motions, remapped commands, multi-key sequences, invalid pending sequences, conflicts, and disabled combinations.

## 3. Modal Engine Integration

- [x] 3.1 Update `src/modal/engine.ts` to consume resolved semantic actions instead of switching directly on hard-coded printable keys.
- [x] 3.2 Preserve insert-mode delegation, normal/visual protected-key delegation, autocomplete escape behavior, and submit/interrupt reset behavior.
- [x] 3.3 Reuse existing buffer helpers for edit semantics so default keymap behavior remains unchanged.
- [x] 3.4 Add modal-engine tests for configured normal motions, visual motions, operators, commands, pending prefixes, protected keys, and default behavior regression.

## 4. UI Configuration

- [x] 4.1 Extend `src/modal/view.ts` to derive status items from resolved UI config, including mode labels, pending command text, selection summary, and cursor position.
- [x] 4.2 Normalize `piVimMode.vimOptions.showmode`, `showcmd`, and `ruler` into UI defaults before explicit `piVimMode.ui` overrides.
- [x] 4.3 Update `src/vim-editor.ts` status rendering to render configured item order while keeping `fitStatusBorder()` as final width guard.
- [x] 4.4 Add render/view tests for default UI, configured labels, narrow labels, hidden mode, hidden selection summary, cursor position base/format, Vim option aliases, and narrow terminal widths.

## 5. Documentation

- [x] 5.1 Update `README.md` settings section with `piVimMode.keymap`, `piVimMode.ui`, and `piVimMode.vimOptions` examples.
- [x] 5.2 Update README keymap and feedback sections to explain defaults, semantic actions, protected Pi shortcuts, line/column display, and UI item ordering.
- [x] 5.3 Update README limitations to state that recursive mappings, counts, text objects, leader maps, full Vimscript parsing, and Neovim Lua parsing remain out of scope.

## 6. Validation

- [x] 6.1 Run `bun test` and fix regressions.
- [x] 6.2 Run `bun run check-types` and fix type errors.
- [x] 6.3 Run `bun run lint` and `bun run format:check` and fix reported issues.
- [x] 6.4 Run `openspec validate make-vimmode-configurable --strict` if supported by the installed OpenSpec CLI and fix spec issues.
