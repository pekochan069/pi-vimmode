## 1. Preset Metadata

- [x] 1.1 Decide whether to keep `src/action-keybinding-recipes.ts` name or introduce shared preset/recipe aliases without duplicating action data.
- [x] 1.2 Add typed action preset IDs for `paragraph-editing` and `markdown-wrapping` using canonical `prompt.transform.*` action IDs.
- [x] 1.3 Ensure preset metadata exposes setting docs anchors, runtime-help labels, settings snippets, and expected resolved bindings from one source of truth.
- [x] 1.4 Add type exports for `VimActionKeybindingPreset` and `piVimMode.keymap.actionPresets` input shape.

## 2. Config Parsing and Resolution

- [x] 2.1 Extend `src/types.ts` keymap options with optional `actionPresets` while preserving existing `keymap.actions` shape.
- [x] 2.2 Parse `piVimMode.keymap.actionPresets` as an array of supported preset IDs with field-by-field warnings for invalid shape or unsupported names.
- [x] 2.3 Expand preset actions before explicit `piVimMode.keymap.actions` for each global/project settings layer.
- [x] 2.4 Preserve override semantics: later presets replace same action ID, explicit actions replace preset entries, and explicit empty arrays clear preset entries.
- [x] 2.5 Route preset-expanded bindings through existing action arg normalization, protected shortcut checks, disabled transform checks, duplicate-key checks, and grammar-conflict checks.
- [x] 2.6 If resolved options store selected preset IDs, update `VimEditor` `cloneOptions` and add a live editor construction regression test.

## 3. Behavior and Config Tests

- [x] 3.1 Add config tests proving defaults still produce no accepted action keybindings.
- [x] 3.2 Add config tests for `paragraph-editing` and `markdown-wrapping` accepted bindings and expected args.
- [x] 3.3 Add config tests for multiple preset merge order, explicit override, explicit empty-array clearing, and project-over-global behavior.
- [x] 3.4 Add config tests for invalid preset shape/name warnings that preserve valid sibling settings.
- [x] 3.5 Add config tests proving disabled prompt transforms and keymap conflicts reject preset-provided bindings with existing warning style.
- [x] 3.6 Add a modal or command regression test showing a preset-derived binding dispatches like the same explicit `keymap.actions` binding.
- [x] 3.7 Confirm or add regression coverage that preset-derived action execution preserves existing dot-repeat, register, mark, search highlight, visual range, macro, feedback, and insert-mode delegation behavior.

## 4. Runtime Help and Drift Guards

- [x] 4.1 Extend runtime feature discovery for `:features keybindings`, `:features action presets`, and preset-name queries.
- [x] 4.2 Keep runtime output compact and explicit about `piVimMode.keymap.actionPresets`, opt-in behavior, no defaults, and no plugin API.
- [x] 4.3 Add runtime-help tests for preset IDs, action IDs, keys, setting name, and opt-in wording.
- [x] 4.4 Extend docs-drift tests so preset docs anchors, action IDs, keys, recipe alignment, and config parsing stay synchronized with source metadata.
- [x] 4.5 Preserve existing finite no-match behavior for unsupported preset, mapping, Vimscript, or plugin queries.

## 5. Documentation

- [x] 5.1 Update `docs/settings.md` with `piVimMode.keymap.actionPresets`, accepted preset IDs, JSON examples, resolution order, overrides, and clearing behavior.
- [x] 5.2 Update `docs/features.md` with runtime discovery guidance and concise action preset descriptions.
- [x] 5.3 Distinguish recipes from presets in docs: recipes are copy-paste snippets, presets are selectable bundles backed by the same finite metadata.
- [x] 5.4 State non-goals in docs: no defaults, no recursive mappings, no runtime `:map`, no `.vimrc`, no plugin API, no diagnostic/help action dispatch, no Vim/Neovim parity.
- [x] 5.5 Leave README unchanged unless an index link is required.

## 6. Validation

- [x] 6.1 Run `bun test test/config.test.ts`.
- [x] 6.2 Run `bun test test/runtime-help.test.ts`.
- [x] 6.3 Run `bun test test/docs-drift.test.ts`.
- [x] 6.4 Run focused modal/editor tests touched by preset-derived dispatch or live option construction.
- [x] 6.5 Run `bun test`.
- [x] 6.6 Run `bun run check-types`.
- [x] 6.7 Run `bun run lint`.
- [x] 6.8 Run `bun run format:check`.
- [x] 6.9 Run `openspec validate add-action-keybinding-presets --strict`.
- [x] 6.10 Run `openspec validate --specs --strict`.
