## 1. Source Cleanup

- [x] 1.1 Remove legacy alias helpers and exports from `src/prompt-transform-actions.ts`; keep canonical `prompt.transform.*` registry and arg validation intact.
- [x] 1.2 Update imports/callers so `src/config.ts` no longer special-cases `promptTransform.*` and treats it as a generic unsupported `piVimMode.keymap.actions` key while preserving valid siblings.
- [x] 1.3 Remove legacy alias metadata from `src/customization.ts` action entries so `:actions`, `:keymap`, keybinding catalog, and popup searches match canonical IDs only.
- [x] 1.4 Inspect `src/runtime-help.ts` and `src/keybinding-discovery-popup.ts` for indirect alias output or query behavior; update only if they still surface `promptTransform.*`.

## 2. Focused Tests

- [x] 2.1 Update `test/prompt-transform-actions.test.ts` to assert canonical registry IDs and no legacy alias helper behavior.
- [x] 2.2 Update `test/config.test.ts` so `promptTransform.reflow` under `piVimMode.keymap.actions` is rejected as unsupported without canonical alias resolution and valid canonical siblings remain accepted.
- [x] 2.3 Update `test/customization.test.ts` so canonical diagnostics still report `prompt.transform.*` and legacy `promptTransform.*` queries return no match.
- [x] 2.4 Update `test/runtime-help.test.ts` so `:features reflow` / `:features prompt.transform.reflow` still report canonical bindings and `:features promptTransform.reflow` returns no match.
- [x] 2.5 Update popup/catalog tests if needed so read-only keybinding discovery never lists `promptTransform.*` aliases.
- [x] 2.6 Update `test/docs-drift.test.ts` to remove positive alias-transition assertions and add guard coverage that fails on stale user-facing `promptTransform.*` support claims.

## 3. Documentation

- [x] 3.1 Update `docs/features.md` to remove legacy alias transition language and document canonical `prompt.transform.*` diagnostic/action queries only.
- [x] 3.2 Update `docs/settings.md` to keep `piVimMode.keymap.actions` canonical-only and remove legacy alias migration/warning language.
- [x] 3.3 Check README/changelog/release-note surfaces; add a concise breaking-change note if the repo has an active user-facing release note location.

## 4. Regression Sweep

- [x] 4.1 Run `rg "promptTransform" src test docs openspec/changes/remove-legacy-prompt-transform-aliases` and verify remaining matches are only intentional negative tests, OpenSpec removal text, or unchanged `piVimMode.promptTransforms.*` setting names.
- [x] 4.2 Confirm prompt transform dispatch behavior is unchanged for canonical accepted bindings, including normal/visual execution, search highlight clearing, registers/marks preservation, macro replay, and dot-repeat non-repeatability through existing tests.
- [x] 4.3 Confirm no edits touch `/home/thinline20/.pi/agent/settings.json`.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate --specs --strict`.
