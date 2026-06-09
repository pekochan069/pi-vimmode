## Why

Action keybinding recipes are discoverable and copy-pasteable today, but users still have to paste full JSON snippets into settings. Named action keybinding presets reduce setup friction for common prompt-authoring workflows while keeping pi-vimmode prompt-local, finite, and opt-in.

## What Changes

- Add an opt-in `piVimMode.keymap.actionPresets` setting that expands named preset IDs into existing `piVimMode.keymap.actions` bindings.
- Ship finite built-in presets based on the existing source-backed recipes:
  - `paragraph-editing`: `gq` reflow, `g>` quote, `g<` unquote.
  - `markdown-wrapping`: `gT` fence, `g>` quote, `g<` unquote.
- Resolve presets before explicit `piVimMode.keymap.actions` so users can override or clear individual action bindings.
- Reuse existing action keybinding validation for canonical action IDs, args, disabled transforms, protected shortcuts, duplicate keys, and grammar conflicts.
- Surface preset availability in runtime help/docs without changing prompt transform behavior.
- Keep presets opt-in: no default action keybindings are introduced.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-keymap-configuration`: keymap config gains named action preset resolution, validation, merge ordering, override semantics, and default-empty behavior.
- `prompt-transform-action-keybindings`: curated action keybinding recipes become reusable preset definitions while preserving canonical `prompt.transform.*` IDs and existing transform semantics.
- `runtime-help-drift-guard`: runtime feature discovery and drift validation cover named action presets in addition to recipes.
- `pi-vimmode-documentation`: user-facing docs describe the preset setting, accepted preset IDs, examples, overrides, and non-goals.

## Non-goals

- No default action keybindings.
- No generic command palette, user plugin API, recursive mappings, `.vimrc`, or runtime `:map` support.
- No new prompt transform actions or text-edit semantics.
- No diagnostic/help action keybinding dispatch.
- No removal of existing `piVimMode.keymap.actions` or action keybinding recipe snippets.

## Impact

- Code seams: `src/types.ts`, `src/config.ts`, `src/action-keybinding-recipes.ts` or a renamed/shared preset module, `src/runtime-help.ts`, and `src/vim-editor.ts` option cloning if resolved options add fields.
- Tests: config parsing/merge tests, runtime-help tests, docs-drift tests, and focused live editor construction tests for any new resolved option field.
- Docs: `docs/settings.md` and `docs/features.md` add named preset guidance while keeping README as index-only unless a link is needed.
- Specs: delta specs for keymap configuration, prompt transform action keybindings, runtime help drift guard, and pi-vimmode documentation.
- Dependencies: no new runtime dependencies or peer dependency changes.
- Compatibility: non-breaking; existing configs and explicit `piVimMode.keymap.actions` behavior remain valid.
