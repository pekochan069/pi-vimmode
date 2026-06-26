## Why

Insert mode currently delegates normal typing to Pi and only supports configured line-opening shortcuts. Users need a small, safe set of insert-mode edit and navigation actions so prompt text can be fixed with modified chords without leaving insert mode or turning `piVimMode.keymap.insert` into a broad Vim mapping runtime.

## What Changes

- Extend `piVimMode.keymap.insert` with finite named insert actions for word/line deletion and cursor movement.
- Preserve existing `openLineBelow` and `openLineAbove` behavior.
- Keep normal insert typing, autocomplete-active input, submit, and unconfigured Pi shortcuts delegated to Pi.
- Reuse existing Vim small-word semantics for insert word movement and word deletion.
- Ensure insert delete actions do not write Vim registers, marks, macros, dot-repeat state, or prompt transform state.
- Document separate readline-style and home-row-mod examples, including the `ctrl+k` conflict between example profiles.
- Non-goals: raw printable mappings such as `jk`/`jj`/`oo`, multi-key insert sequences, insert abbreviations, presets, prompt transforms under `keymap.insert`, macro replay changes, dot-repeat changes, or full Vim/Neovim parity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-keymap-configuration`: extends finite insert-mode keymap support from line-opening only to safe insert edit and navigation actions.
- `prompt-buffer-operations`: adds insert-safe movement/delete operations that reuse existing small-word and line-boundary semantics without returning registers.
- `pi-vimmode-documentation`: documents safe insert bindings, examples, validation rules, and non-goals.

## Impact

- Code seams: `src/types.ts`, `src/config.ts`, `src/keymap-descriptors.ts`, `src/modal/engine.ts`, `src/buffer.ts`, and modal/core edit-effect paths where register side effects are applied.
- Tests: config parsing/diagnostics, insert dispatch, autocomplete delegation, raw printable rejection, duplicate bindings, no-register insert deletes, prompt-boundary no-ops, word behavior, and `deleteLineForward` newline join behavior.
- Docs: `docs/features.md`, `docs/settings.md`, and release notes as needed.
- Dependencies: no new runtime dependencies and no peer/runtime dependency changes.
- Compatibility: no default insert bindings added; existing users keep current insert-mode delegation unless they opt in.
