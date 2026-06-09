## 1. Metadata Registry

- [x] 1.1 Add a small typed diagnostic/help metadata module (for example `src/diagnostic-actions.ts`) with `vimmode.doctor`, `vimmode.actions`, `vimmode.keymap`, `vimmode.mapcheck`, `vimmode.help`, `vimmode.features`, `vimmode.messages`, and `vimmode.inspect` entries.
- [x] 1.2 Include command names, aliases/topics, category, description, examples, docs/spec/test anchors, and an explicit non-bindable or metadata-only flag on each entry.
- [x] 1.3 Add focused registry tests for unique IDs, required anchors, `vimmode.*` ID shape, and metadata-only/non-bindable invariants.
- [x] 1.4 Keep the registry descriptive only: no modal dispatch callbacks, no plugin API, no parser expansion, and no dependency additions.

## 2. Customization Diagnostics

- [x] 2.1 Wire diagnostic/help metadata into `:actions` search so queries like `vimmode.doctor`, `vimdoctor`, and `vimmode.help` return the canonical metadata entry and non-bindable classification.
- [x] 2.2 Update empty `:actions` output to summarize diagnostic/runtime-help metadata separately from commands, motions, operators, text objects, macros, marks, searches, and prompt transforms.
- [x] 2.3 Ensure keymap-oriented diagnostics report metadata-only diagnostic/help actions as not bindable rather than unbound configurable actions.
- [x] 2.4 Add customization tests for diagnostic metadata lookup, unsupported diagnostic action no-match behavior, category counts, and preserved prompt/editor state for metadata lookup.

## 3. Runtime Help and Feature Discovery

- [x] 3.1 Reuse diagnostic/help metadata in `:features` query handling for `vimmode.*`, command-name, and alias/topic searches.
- [x] 3.2 Update general `:features` classification so diagnostics and runtime help are distinct finite categories, not prompt transforms or command-palette entries.
- [x] 3.3 Update `:help` topic handling for actions/diagnostics/runtime-help topics so output includes finite command names and metadata-only/no-keybinding/no-plugin limits.
- [x] 3.4 Add runtime-help tests for `:features vimmode.doctor`, `:features vimdoctor`, `:help actions`, `:help diagnostics`, and unsupported parity queries.

## 4. Config and Alias Safety

- [x] 4.1 Add config tests proving `piVimMode.keymap.actions` rejects metadata-only IDs such as `vimmode.doctor` with warnings and preserves valid sibling `prompt.transform.*` bindings.
- [x] 4.2 Add or keep tests proving legacy `promptTransform.*` IDs are rejected from config with canonical `prompt.transform.*` warning guidance.
- [x] 4.3 Add diagnostics/runtime-help tests proving legacy `promptTransform.*` aliases remain searchable and resolve to canonical `prompt.transform.*` output during the transition release.
- [x] 4.4 Verify the accepted bindable action ID set remains prompt-transform-only and excludes every diagnostic/help metadata ID.

## 5. Docs and Drift Guard

- [x] 5.1 Extend docs-drift tests so every diagnostic/help metadata entry has a valid `docs/features.md` anchor, durable spec anchor, and test anchor.
- [x] 5.2 Add docs-drift validation that command-backed diagnostic/help metadata maps to finite Ex parser support or declares an explicit exception.
- [x] 5.3 Add docs-drift validation that diagnostic/help metadata entries are excluded from the bindable prompt transform action ID set.
- [x] 5.4 Update `docs/features.md` with a concise pi-vimmode quickref/classification section covering modal editing, Ex line commands, prompt transforms, customization diagnostics, runtime help/inspectability, and keybindable prompt transform actions.
- [x] 5.5 Update docs wording to keep canonical `prompt.transform.*` config IDs, temporary diagnostics-only `promptTransform.*` aliases, and non-goals for plugin API, diagnostic keybinding dispatch, `:map`, `:action`, Vimscript, Neovim Lua, help tags, and quickref parity clear.

## 6. Side-Effect Regression Coverage

- [x] 6.1 Add or update modal tests proving diagnostic/help metadata lookups do not edit prompt text, cursor position, visual selection, search highlights, registers, marks, macros, or dot-repeat state beyond existing diagnostic message behavior.
- [x] 6.2 Add or update message-history tests proving `:messages` still does not retain its own output after metadata/runtime-help changes.
- [x] 6.3 Add protected shortcut regression coverage for `:features ctrl+p` or equivalent to confirm protected shortcut discovery still uses the protected shortcut catalog.

## 7. Validation

- [x] 7.1 Run `bun test`.
- [x] 7.2 Run `bun run check-types`.
- [x] 7.3 Run `bun run lint`.
- [x] 7.4 Run `bun run format:check`.
- [x] 7.5 Run `openspec validate diagnostic-action-registry-quickref --strict`.
- [x] 7.6 Run `openspec validate --specs --strict`.
