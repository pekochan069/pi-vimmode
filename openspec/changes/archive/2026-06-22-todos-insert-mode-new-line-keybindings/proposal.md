## Why

`TODOS.md` calls out insert-mode newline keybindings because users currently must leave insert mode to use `o` / `O`-style line opening. This slows prompt editing and makes configured protected newline chords look broken while insert mode delegates everything except escape aliases to Pi.

## What Changes

- Add explicit insert-mode keybindings for opening a blank line below or above the current prompt line while staying in insert mode.
- Keep ordinary insert-mode text, autocomplete, submit/reset keys, and Pi-owned shortcuts delegated unless a user opts into these insert newline bindings.
- Reuse existing prompt-buffer `openLineBelow` / `openLineAbove` semantics for empty prompts and cursor placement.
- Document the insert-mode ownership exception and validation rules.
- Non-goals: full insert-mode mapping support, Vimscript, recursive mappings, timeout mappings, insert abbreviations, or broad protected-shortcut takeover.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-mode-editor`: insert mode gains opt-in newline commands while preserving default Pi text editing and autocomplete delegation.
- `vim-keymap-configuration`: semantic keymap configuration gains a finite insert-mode newline binding surface with validation and protected-key behavior.

## Impact

- Code seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/config.ts`, `src/commands.ts`, `src/modal/engine.ts`, `src/modal/normal.ts` or shared line-command helpers, and `src/vim-editor.ts` fast-path guards if needed.
- Tests: config parsing, command resolution, modal insert dispatch, fast-path fallback, buffer reuse coverage, and live `VimEditor` smoke tests for configured insert newline keys.
- Docs: `docs/features.md`, `docs/settings.md`, runtime keybinding/discovery text if insert bindings are listed there, and `TODOS.md` checkbox.
- Dependencies: no new runtime dependencies.
- Compatibility: no breaking changes; defaults preserve current insert-mode Pi delegation.
