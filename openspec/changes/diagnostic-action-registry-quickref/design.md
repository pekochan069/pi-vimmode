## Context

`pi-vimmode` already has three related discovery surfaces:

- `src/customization.ts` formats `:actions`, `:keymap`, `:mapcheck`, and `:vimdoctor` from resolved keymap/options metadata.
- `src/runtime-help.ts` formats `:help`, `:features`, and `:messages` from a finite help registry plus selected customization/protected-shortcut metadata.
- `src/prompt-transform-actions.ts` owns canonical bindable `prompt.transform.*` action metadata and temporary legacy `promptTransform.*` diagnostic aliases.

Diagnostic/help Ex commands are currently discoverable mostly as prose or topics, not as first-class metadata entries. This makes `:actions`, `:features`, `:help`, docs quickrefs, and docs-drift tests easier to desynchronize. The change is cross-cutting metadata/documentation work; parser support and modal execution for the relevant commands already exist and should remain finite/read-only.

## Goals / Non-Goals

**Goals:**

- Add typed source-backed metadata for finite diagnostic/help action IDs such as `vimmode.doctor`, `vimmode.actions`, `vimmode.keymap`, `vimmode.mapcheck`, `vimmode.help`, `vimmode.features`, `vimmode.messages`, and `vimmode.inspect`.
- Mark diagnostic/help action IDs as metadata-only and non-bindable everywhere config validation can see them.
- Reuse this metadata in `:actions`, `:features`, `:help`, and docs-drift validation so classification and quickref docs stay aligned.
- Keep effective-state behavior for disabled/renamed prompt transforms, macros, marks, and protected shortcuts.
- Preserve legacy `promptTransform.*` aliases as diagnostic/search aliases until the planned one-release-cycle transition ends.

**Non-Goals:**

- No new user plugin API or public registry extension point.
- No keybinding dispatch for diagnostic/help actions.
- No new Ex commands, parser broadening, `:map`, `:action`, Vimscript, Neovim Lua, `.vimrc`, recursive mappings, help pager, or quickref parity.
- No migration of `piVimMode.promptTransforms.actions` or `piVimMode.promptTransforms.commands` into `piVimMode.keymap.actions`.

## Decisions

### Decision: Add a separate metadata-only diagnostic action registry

Target seams: new small helper such as `src/diagnostic-actions.ts`, imported by `src/customization.ts`, `src/runtime-help.ts`, and docs-drift tests.

Each entry should carry a stable metadata ID, category (`diagnostic` or `runtimeHelp`), command/query terms, description, examples, docs/spec/test anchors, and `bindable: false`. Entries describe existing finite commands; they do not contain dispatch functions.

Alternatives considered:

- Extend `src/prompt-transform-actions.ts`: rejected because that file is the bindable prompt-transform registry used by config parsing, and mixing diagnostic IDs into it increases the risk of accepting non-editing commands as keybindings.
- Keep hardcoded strings in `customization.ts` and `runtime-help.ts`: rejected because this is the current drift source.
- Generate entries from the Ex parser: rejected because parser types do not carry docs anchors, examples, limits, or user-facing classification.

### Decision: Keep bindability as a type/config boundary, not a runtime convention

Target seams: `src/prompt-transform-actions.ts`, `src/config.ts`, `src/types.ts`, and config tests.

`piVimMode.keymap.actions` should continue to accept only `BindablePromptTransformActionId` (`prompt.transform.*`). Metadata-only IDs such as `vimmode.doctor` and aliases such as `promptTransform.reflow` should be rejected with warnings that preserve valid sibling entries. Diagnostic/help metadata can be searchable, but config must not treat it as dispatchable.

Alternatives considered:

- Add `vimmode.*` IDs to the existing bindable union and reject later: rejected because it weakens compile-time protection and invites modal dispatch branches.
- Add a generic action registry with bindable and metadata-only entries in one array: acceptable only if TypeScript discriminants make the non-bindable subset impossible to pass into config acceptance; a separate registry is simpler for this milestone.

### Decision: Route discovery through shared metadata while preserving current command scopes

Target seams: `actionsMessage`, `searchActions`, `runtimeHelpMessage`, `runtimeFeaturesMessage`, `test/customization.test.ts`, and `test/runtime-help.test.ts`.

`:actions` should remain an action/diagnostic search surface, not a general help browser. Its empty summary may include diagnostic/runtime-help counts or categories, and queries should find metadata IDs, command names, descriptions, and aliases. `:features` should keep broader feature lookup and effective runtime state reporting. `:help` should keep finite topic help and limits. All three should use the same metadata entries where they talk about diagnostic/help actions.

Alternatives considered:

- Make `:actions` delegate entirely to `:features`: rejected because existing specs say `:actions` stays action-focused and `:features` is broader.
- Hide diagnostic/help commands from `:actions`: rejected because the requested action metadata would be less discoverable and current docs already position `:actions` as supported-action search.

### Decision: Treat quickref classification as docs plus drift-guarded metadata, not Neovim parity

Target seams: `docs/features.md`, `src/runtime-help.ts`/new metadata anchors, and `test/docs-drift.test.ts`.

The quickref should group supported pi-vimmode surfaces by actual behavior: modal motions/edits, Ex line commands, prompt transforms, customization diagnostics, runtime help/inspectability, and keybindable prompt transform actions. It should explicitly exclude unsupported quickref/parity surfaces such as Vim help tags, `:map`, `:action`, plugin APIs, and diagnostic keybinding dispatch.

Alternatives considered:

- Import a Neovim quickref taxonomy wholesale: rejected because pi-vimmode is prompt-local and finite.
- Keep docs prose only: rejected because docs-drift tests can cheaply enforce that metadata anchors and quickref entries stay present.

### Decision: Preserve existing read-only side-effect boundaries

Target seams: `src/ex.ts`, `src/modal/engine.ts`, `src/modal/ex-command-line.ts` if touched, plus modal tests.

This change should not add parser branches or modal dispatch. If implementation touches execution to wire metadata messages, diagnostic/help commands must still preserve prompt text, cursor position, visual state, search highlights, registers, marks, macros, message-history rules, and dot-repeat except for existing transient/retained diagnostic message behavior. `:messages` must not retain its own output.

Alternatives considered:

- Dispatch `vimmode.*` metadata IDs through a generic modal action executor: rejected because it creates keybinding/plugin API pressure and bypasses finite Ex parser contracts.

## Risks / Trade-offs

- Metadata duplicates command names already known by `src/ex.ts` → Mitigation: drift tests should assert metadata command names are accepted by parser where applicable and docs anchors exist.
- `:actions` output becomes too dense for one-row feedback → Mitigation: keep empty summaries compact; query output returns one best match; long docs remain in `docs/features.md`.
- Metadata-only IDs accidentally become bindable → Mitigation: keep diagnostic registry separate from `BindablePromptTransformActionId`; add config tests for `vimmode.doctor` rejection and legacy alias rejection.
- Legacy alias transition is forgotten → Mitigation: keep explicit tests/docs for `promptTransform.*` search aliases and TODO/removal note tied to the release cycle.
- Quickref wording implies Vim/Neovim parity → Mitigation: classify only supported pi-vimmode behavior and keep limitations adjacent.

## Migration Plan

1. Add metadata-only diagnostic/help entries and unit tests for IDs, aliases, docs anchors, and `bindable: false` invariants.
2. Wire metadata into customization/runtime-help lookup and update focused tests for `:actions`, `:features`, and `:help` queries.
3. Extend docs-drift tests for metadata docs/spec/test anchors and quickref classification anchors.
4. Update `docs/features.md` quickref/runtime-help prose without duplicating full settings docs.
5. Verify with `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback is simple because behavior is additive metadata/docs work: revert registry wiring and docs updates. Existing parser/modal command execution remains unchanged.

## Open Questions

- Exact metadata file name can be chosen during implementation (`diagnostic-actions.ts`, `runtime-action-metadata.ts`, or similar), but it should not live in the bindable prompt-transform registry.
- Exact one-row wording for empty `:actions`/`:features` summaries can be tuned in tests, provided category separation and no-parity limits remain clear.
