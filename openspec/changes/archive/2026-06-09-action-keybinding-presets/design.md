## Context

`typed-action-registry-keybindings` shipped canonical `prompt.transform.*` action IDs and opt-in `piVimMode.keymap.actions`. Current docs show raw examples, but users still need to know which transform IDs compose into useful workflows. Runtime help can find actions and bindings, but it does not yet surface recommended copy-paste recipes.

This change is documentation/discovery-first. It should not change prompt transform semantics, modal dispatch, default keymaps, or the config schema beyond reusable recipe metadata/tests if needed.

## Goals / Non-Goals

**Goals:**

- Make common prompt transform action keybindings easy to adopt with copy-pasteable settings recipes.
- Surface recommended recipes through source-backed runtime feature/help output.
- Keep docs, runtime help, action registry metadata, and tests drift-guarded.
- Verify recipe snippets parse through existing `piVimMode.keymap.actions` validation with no warnings.

**Non-Goals:**

- No default action keybindings.
- No new `piVimMode.keybindingPreset` or preset application behavior.
- No user plugin API, command palette, runtime `:map`, or runtime `:action`.
- No diagnostic/help action keybinding dispatch.
- No removal of legacy `promptTransform.*` diagnostic aliases.
- No new prompt transform actions or text-edit semantics.

## Decisions

1. **Represent recipes as source-backed metadata, not config behavior.**
   - Target seams: `src/runtime-help.ts`, possibly a small `src/action-keybinding-recipes.ts`, `test/docs-drift.test.ts`, `test/runtime-help.test.ts`, `docs/settings.md`, `docs/features.md`.
   - Decision: add curated recipe data that describes existing `piVimMode.keymap.actions` snippets. Recipes are examples only; resolving default options must still produce no accepted action bindings.
   - Alternative rejected: add `piVimMode.keybindingPreset` setting. That would be new config behavior, require propagation through `src/types.ts`, `src/config.ts`, `VimEditor` cloning, live editor tests, and semantics for precedence/overrides. Current goal is adoption guidance, not automatic binding.

2. **Keep recipes canonical and finite.**
   - Target seams: action recipe metadata and config tests.
   - Decision: recipe snippets use only canonical `prompt.transform.*` IDs and existing string or `{ key, args }` binding shapes. Initial recipes should cover paragraph editing (`gq`, `g>`, `g<`) and Markdown wrapping (fence, quote, unquote), with optional compact cleanup only if it composes existing transforms without implying new semantics.
   - Alternative rejected: document legacy `promptTransform.*` IDs or `vimmode.*` IDs in recipes. Legacy IDs are diagnostic aliases only, and `vimmode.*` entries are metadata-only; using either in snippets would contradict existing config rules.

3. **Expose recipe discovery through `:features keybindings`.**
   - Target seams: `src/runtime-help.ts`, `test/runtime-help.test.ts`, `docs/features.md`.
   - Decision: make feature discovery return source-backed recipe guidance for queries such as `keybindings`, `action keybindings`, or recipe names. Output should be compact and include recommended action IDs/keys or a terse JSON snippet reference, without adding a pager or broad quickref.
   - Alternative rejected: add a new Ex command such as `:recipes`. Existing `:features` is already the finite discovery surface; a new command would expand parser/API surface for little gain.

4. **Validate recipes through existing config resolution.**
   - Target seams: `test/config.test.ts` and/or `test/docs-drift.test.ts`.
   - Decision: tests should parse every documented/source-backed recipe via `resolveVimOptions` and assert no warnings plus accepted bindings for expected action IDs/keys. This reuses current field-by-field validation, protected shortcut checks, and action arg validation.
   - Alternative rejected: snapshot recipe strings only. String snapshots can pass while the config parser rejects the actual snippet.

5. **Drift guard docs/runtime alignment with anchors.**
   - Target seams: `test/docs-drift.test.ts`, `docs/settings.md`, `docs/features.md`.
   - Decision: recipe metadata should carry docs anchors or stable IDs, and drift tests should ensure docs mention each recipe, its action IDs, and runtime help test anchors. Existing docs drift tests already validate action registry anchors; extend that pattern instead of inventing another validation tool.
   - Alternative rejected: rely on manual docs review. This project already treats docs/source/spec/test drift as a tested contract.

## Risks / Trade-offs

- **Runtime help output becomes too long** → Keep `:features keybindings` compact and put full formatted snippets in docs; include enough snippet text to be actionable.
- **Recipe keys conflict with user custom mappings** → State recipes are examples and rely on existing validation/warnings; no defaults are installed.
- **Docs snippets drift from source-backed recipe metadata** → Add drift tests that parse recipe configs and check docs anchors/action IDs/keys.
- **Recipe names imply automatic presets** → Use “recipes”/“snippets,” not “presets” in config semantics, and explicitly say no default or automatic application exists.
- **Compact cleanup recipe overpromises behavior** → Include it only if existing transforms (`reflow`, `bulletize`, `indent`/`dedent`, quote/unquote/fence) express the workflow without new action semantics.

## Migration Plan

1. Add source-backed recipe metadata or local runtime-help recipe helpers.
2. Update runtime feature/help output for keybinding recipe discovery.
3. Add docs snippets in settings/features docs with stable anchors.
4. Add config/runtime-help/docs-drift tests.
5. Validate with targeted tests, full suite, typecheck, lint, format check, and OpenSpec validation.

Rollback is simple: remove recipe metadata/help output/docs/tests. No user settings migration is required because no defaults or schema changes are introduced.

## Open Questions

- Should recipe metadata live in a dedicated module (`src/action-keybinding-recipes.ts`) or stay inside `src/runtime-help.ts` until it grows?
- Should `:features keybindings` show full one-line JSON snippets or only compact recipe summaries plus docs pointers?
- Should the compact cleanup recipe ship in this change, or wait for user feedback after paragraph/Markdown recipes?
