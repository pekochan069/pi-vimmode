## Context

`src/runtime-help.ts`, `src/diagnostic-actions.ts`, `src/keybinding-discovery-popup.ts`, and `src/action-keybinding-recipes.ts` currently mix two concerns:

- Runtime data used to render finite help, diagnostics, keybinding discovery, recipe/preset discovery, and popup content.
- Docs/test-only validation metadata such as `docsAnchor`, `specAnchor`, `testAnchors`, and parser examples used by `test/docs-drift.test.ts`.

That coupling puts strings for OpenSpec paths, test paths, parser examples, and docs anchors on the runtime import path and can keep them in `dist/index.js`. The public behavior must stay unchanged: read-only Ex commands remain finite, prompt-local, bounded, and non-mutating.

## Goals / Non-Goals

**Goals:**

- Keep runtime registries to fields required for public help/diagnostic/config/popup behavior.
- Move docs drift metadata into test/dev-owned metadata that is not imported by runtime modules.
- Preserve test coverage that proves docs anchors, spec paths, parser examples, bindability boundaries, and recipe/preset docs stay aligned.
- Add build/package verification that `dist/index.js` no longer contains removed docs/test-only metadata.
- Preserve existing command output, parser support, popup behavior, config validation, and action bindability.

**Non-Goals:**

- No changes to supported Ex commands, keybindings, settings, prompt transforms, diagnostics, or popup controls.
- No new runtime dependencies.
- No full Vim help tags, runtime `:map`, runtime `:action`, plugin API, command palette, or broader Vim/Neovim parity.
- No changes to `/home/thinline20/.pi/agent/settings.json`.

## Decisions

### Decision: Use stable runtime IDs as metadata join keys

Target seams: `src/runtime-help.ts`, `src/diagnostic-actions.ts`, `src/action-keybinding-recipes.ts`, `test/docs-drift.test.ts`.

Runtime entries keep stable identifiers already needed by runtime behavior, such as runtime help `id`, diagnostic action `id`, recipe/preset `id`, popup command names, and command strings. Docs drift metadata moves to a test/dev module keyed by those identifiers, for example:

- runtime help docs metadata: `id`, `docsAnchor`, `specAnchor`, `testAnchors`
- diagnostic action docs metadata: `id`, `docsAnchor`, `specAnchor`, `testAnchors`
- read-only popup command metadata: `command`, `parserExample`, `docsAnchor`
- action recipe/preset docs metadata: `id`, `docsAnchor`, `presetDocsAnchor`

Alternatives considered:

- Keep anchors on runtime entries and rely on minification. Rejected because the strings remain reachable and obscure ownership.
- Duplicate runtime registries in tests. Rejected because it can drift silently unless every runtime entry is joined and counted.
- Generate metadata from docs. Rejected as unnecessary for this small finite surface and harder to type-check.

### Decision: Make docs drift tests prove both directions of alignment

Target seams: `test/docs-drift.test.ts`, possible new `test/support/runtime-docs-metadata.ts`.

Tests should verify every runtime entry has exactly one metadata record and every metadata record points at a live runtime entry. Then existing anchor/spec/test/parser validations run through the metadata module rather than through runtime types.

Alternatives considered:

- Only verify metadata entries against docs. Rejected because runtime entries could lose drift coverage.
- Only verify runtime entries against metadata. Rejected because stale metadata could survive after runtime entries are removed.

### Decision: Remove popup `docsAnchor` from runtime if no renderer uses it

Target seams: `src/read-only-popup.ts`, `src/keybinding-discovery-popup.ts`, popup tests.

`ReadOnlyPopup.docsAnchor` appears to be validation-only. Implementation should confirm no runtime renderer or adapter uses it. If unused, remove it from popup shape and from `popupFromMessage` inputs. If a real runtime consumer exists, keep only that consumer-required field and still move parser examples and spec/test anchors out of runtime.

Alternatives considered:

- Remove all popup metadata without checking consumers. Rejected because popup state is shared across modal engine, overlay, and editor adapter.
- Keep all popup metadata. Rejected because it misses part of the byte-reduction goal.

### Decision: Preserve source-backed runtime discovery output, not docs-anchor ownership

Target seams: `src/runtime-help.ts`, `src/diagnostic-actions.ts`, `src/keybinding-discovery-popup.ts`, `src/action-keybinding-recipes.ts`.

Runtime modules still own user-facing summaries, topics, examples shown to users, limits, command names, recipe bindings, preset actions, and effective-state lookup. Only metadata that exists solely to point tests at docs/spec/test files moves out.

Alternatives considered:

- Move summaries/examples into test metadata too. Rejected because runtime help needs them to answer `:help` and `:features`.
- Remove runtime recipe discovery. Rejected because `:features keybindings` is public behavior.

### Decision: Use build artifact inspection as verification, not runtime behavior gate

Target seams: `bun run build`, `dist/index.js`, possibly a small script if useful.

Validation should include building the package and checking that docs/test-only strings removed from runtime modules do not appear in `dist/index.js` through accidental imports. This is package hygiene verification; runtime behavior remains covered by existing tests.

Alternatives considered:

- Add a unit test that reads `dist/index.js`. Rejected unless build is guaranteed before tests, because normal `bun test` should not require a prior build artifact.
- Skip bundle inspection. Rejected because source cleanup can still accidentally import test metadata into runtime.

## Risks / Trade-offs

- Metadata join drift → Mitigation: docs drift tests assert one-to-one mappings between runtime entries and dev/test metadata.
- Accidental runtime import of test metadata → Mitigation: build `dist/index.js` and grep for removed metadata strings such as `openspec/specs/`, `test/`, `specAnchor`, and `testAnchors`.
- Over-removing fields needed by popup renderer → Mitigation: inspect `ReadOnlyPopup` consumers before deleting `docsAnchor`; keep any field with real runtime use.
- Type churn across tests → Mitigation: update focused tests around runtime help entries, diagnostic action entries, popup commands, and recipes in the same change.
- User-facing behavior regression → Mitigation: keep runtime output fields in runtime modules and run existing modal/runtime-help/customization tests.

## Migration Plan

1. Add test/dev metadata keyed by runtime IDs and update docs drift tests to consume it.
2. Remove docs/test-only fields from runtime entry types one group at a time: runtime help entries, diagnostic actions, read-only popup command list/parser examples, and recipe/preset docs anchors.
3. Update focused tests that currently assert anchors on runtime objects so they assert lean runtime objects plus metadata coverage instead.
4. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.
5. Run `bun run build` and inspect `dist/index.js` for removed metadata strings.
6. Rollback is safe by reverting the metadata split; no data migration or user config migration exists.

## Open Questions

- None known. Implementation should only pause if a supposedly docs-only field is found to be used by a real runtime renderer or public API.
