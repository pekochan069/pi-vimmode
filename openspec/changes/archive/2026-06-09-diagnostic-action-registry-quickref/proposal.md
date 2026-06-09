## Why

Diagnostic and runtime-help commands are visible to users, but their metadata is split across help text, customization diagnostics, docs, and quick-reference prose. A registry-backed classification pass will make `:actions`, `:features`, `:help`, and docs quickrefs consistent while preserving the current no-API/no-dispatch boundary.

## What Changes

- Add source-backed metadata for diagnostic/help actions such as `vimmode.doctor`, `vimmode.actions`, `vimmode.keymap`, `vimmode.mapcheck`, `vimmode.help`, `vimmode.features`, `vimmode.messages`, and `vimmode.inspect`.
- Classify those entries as metadata-only diagnostics/runtime-help actions, not bindable prompt transform actions.
- Improve `:actions`, `:features`, and `:help` output so diagnostic/help entries appear under clear categories and search terms without implying a full command palette.
- Update the Neovim-style quick reference in `docs/features.md` so commands, diagnostics, runtime help, and prompt transform action keybindings are grouped accurately.
- Keep legacy `promptTransform.*` diagnostic/search aliases for the existing one-release-cycle transition, while canonical config remains `prompt.transform.*` only.
- Non-goals: no public plugin action API, no user-defined diagnostic action registry, no keybinding dispatch for diagnostic/help actions, no broad Vim/Neovim quickref parity, no `:map`/`:action`/Vimscript support.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-customization-diagnostics`: Diagnostic/help action metadata is discoverable and clearly marked metadata-only; diagnostics remain read-only and finite.
- `runtime-help-drift-guard`: Runtime help and feature discovery classify diagnostic/help metadata consistently and keep docs/spec/test anchors aligned.
- `pi-vimmode-documentation`: User docs and quickref tables distinguish commands, diagnostics, runtime help, prompt transform action keybindings, and unsupported parity features.
- `prompt-transform-action-keybindings`: Legacy `promptTransform.*` aliases remain diagnostic/search aliases for one release cycle and diagnostic/help action IDs remain non-bindable.

## Impact

- Affected code seams: likely `src/customization.ts`, `src/runtime-help.ts`, `src/prompt-transform-actions.ts` or a small new metadata helper; parser and modal execution should remain finite in `src/ex.ts` and `src/modal/engine.ts` with no new dispatch path.
- Tests: update focused customization/runtime-help/docs-drift tests; add coverage that metadata-only diagnostic/help action IDs are searchable but rejected from `piVimMode.keymap.actions`.
- Docs: update `docs/features.md` quickref/classification and any runtime-help anchors needed by drift guard.
- Dependencies: no new runtime dependencies and no peer/runtime dependency changes.
- Compatibility: no breaking changes; canonical `prompt.transform.*` config remains required, while legacy `promptTransform.*` aliases continue only for diagnostics/search during the transition.
