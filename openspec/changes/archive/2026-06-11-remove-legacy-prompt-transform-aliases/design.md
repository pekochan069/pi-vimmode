## Context

`prompt.transform.*` is now the canonical bindable prompt transform action ID family. The legacy `promptTransform.*` alias family remains in source only as a temporary diagnostic/search compatibility bridge: `src/prompt-transform-actions.ts` maps aliases, `src/customization.ts` exposes aliases through action metadata search, `src/config.ts` special-cases alias rejection, and docs/tests require transition coverage.

This change ends that transition. The user-facing action surface becomes one canonical namespace: `prompt.transform.*`. Existing `piVimMode.promptTransforms.actions` and `piVimMode.promptTransforms.commands` settings remain separate and unchanged.

## Goals / Non-Goals

**Goals:**

- Remove runtime diagnostic/search support for `promptTransform.*` aliases.
- Keep canonical `prompt.transform.*` config, diagnostics, runtime help, popup output, and docs aligned.
- Keep non-canonical IDs rejected field-by-field without discarding valid sibling keybindings.
- Update OpenSpec, docs, and drift tests so stale alias claims fail validation.

**Non-Goals:**

- No new prompt transform behavior, command parser surface, or modal grammar.
- No removal of `piVimMode.promptTransforms.*` settings.
- No default action keybindings, recursive mappings, plugin API, runtime `:map`, runtime `:action`, Vimscript, or Neovim parity.
- No migration shim beyond telling users to query/configure canonical `prompt.transform.*` IDs.

## Decisions

### Decision 1: Delete alias metadata instead of keeping hidden alias lookup

Target seams: `src/prompt-transform-actions.ts`, `src/customization.ts`, `src/runtime-help.ts`.

Remove `legacyPromptTransformActionAliasForId` and `canonicalPromptTransformActionIdForLegacyAlias`, then stop attaching `aliases: [promptTransform.*]` to prompt transform action entries. `searchActions(...)`, `actionsMessage(...)`, `keymapMessage(...)`, runtime feature discovery, and keybinding popup content should only match canonical IDs, action descriptions, Ex command names, and actual bindings.

Alternatives considered:

- Keep alias lookup but hide aliases from docs. Rejected because hidden compatibility keeps duplicate behavior and makes drift guard unable to prove removal.
- Keep aliases only in `:features`. Rejected because users would still see mixed namespaces and diagnostics would diverge.

### Decision 2: Treat `promptTransform.*` as ordinary unsupported action IDs in config

Target seams: `src/config.ts`, `test/config.test.ts`.

Remove special-case canonical suggestion logic for legacy aliases. `piVimMode.keymap.actions.promptTransform.reflow` should follow the same unsupported-ID path as any unknown action ID, record one warning for that field, ignore that entry, and preserve valid canonical siblings.

Alternatives considered:

- Keep a nicer migration warning naming `prompt.transform.reflow`. Rejected because it requires preserving alias parsing after removal and extends the transition bridge.
- Fail whole `keymap.actions` when a legacy key appears. Rejected because existing config behavior preserves valid siblings field-by-field.

### Decision 3: Make docs drift guard reject stale alias claims

Target seams: `docs/features.md`, `docs/settings.md`, `test/docs-drift.test.ts`, OpenSpec specs.

Replace positive assertions requiring `promptTransform.*` docs/tests with negative assertions that prevent stale transition language from returning. Existing positive assertions for canonical `prompt.transform.*` IDs and docs anchors remain.

Alternatives considered:

- Rely on normal docs review. Rejected because alias language spans docs, specs, registry tests, runtime help tests, and could regress silently.
- Remove all docs-drift coverage for aliases. Rejected because the breaking removal needs a guard against stale user-facing instructions.

### Decision 4: Scope runtime side effects to diagnostics only

Target seams: `src/customization.ts`, `src/runtime-help.ts`, `src/keybinding-discovery-popup.ts`.

Removing alias search changes only which query strings match diagnostic/help metadata. Prompt text, cursor, visual state, registers, marks, macros, search highlights, dot-repeat, Ex messages, and Pi delegation behavior remain unchanged. Accepted keybound prompt transform dispatch still uses canonical accepted bindings only.

Alternatives considered:

- Add explicit alias error messages in diagnostic commands. Rejected because finite no-match output is already the supported behavior for unsupported queries and avoids new parser branches.

## Risks / Trade-offs

- Users relying on `:actions promptTransform.reflow` or `:features promptTransform.reflow` lose that query path → Mitigation: docs state canonical `prompt.transform.reflow`; release notes/tasks call out breaking removal.
- Removing alias helpers can miss indirect references in popup/help output → Mitigation: update docs drift, runtime-help, customization, and popup tests; run `rg "promptTransform"` before completion.
- Config warning text changes can break tests or downstream expectations → Mitigation: assert only unsupported-field behavior and valid sibling preservation, not legacy canonical suggestion text.
- Specs can leave contradictory transition requirements behind → Mitigation: include deltas for prompt transform action keybindings, keymap configuration, customization diagnostics, runtime help drift guard, and docs.

## Migration Plan

1. Update OpenSpec deltas and docs to mark `promptTransform.*` aliases removed.
2. Remove alias helper exports and alias metadata from source.
3. Remove alias-specific config handling; use generic unsupported action ID behavior.
4. Update tests for registry, config warnings, diagnostics, runtime feature discovery, popup output, and docs drift.
5. Validate with `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback strategy: restore alias helper functions, alias metadata, special-case config warning, transition docs, and alias tests if release feedback requires one more compatibility cycle.

## Open Questions

- Should release notes or changelog explicitly label this as a breaking change outside the OpenSpec proposal? Default: yes during implementation if this repo keeps a release note/changelog for user-visible removals.
