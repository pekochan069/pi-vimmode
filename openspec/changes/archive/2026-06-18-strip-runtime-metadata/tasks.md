## 1. Test Metadata Scaffold

- [x] 1.1 Create a test/dev metadata module keyed by stable runtime IDs for runtime help entries, diagnostic actions, read-only popup commands, and action recipe/preset docs anchors.
- [x] 1.2 Update `test/docs-drift.test.ts` to assert one-to-one coverage between runtime entries and test/dev metadata before checking docs anchors, spec files, test anchors, parser examples, bindability boundaries, and recipe/preset docs.
- [x] 1.3 Add focused failure-safe assertions that stale metadata entries fail when no matching runtime entry, diagnostic action, popup command, recipe, or preset exists.

## 2. Runtime Registry Cleanup

- [x] 2.1 Remove docs/test-only fields from `RuntimeHelpEntry` and `ENTRIES` in `src/runtime-help.ts`; keep user-facing summaries, topics, examples, limits, and runtime behavior unchanged.
- [x] 2.2 Update `test/runtime-help.test.ts` so it verifies runtime help output and lean runtime entry shape, while docs/spec/test anchor checks use the new test/dev metadata.
- [x] 2.3 Remove docs/test-only fields from `DiagnosticActionEntry` and `DIAGNOSTIC_ACTIONS` in `src/diagnostic-actions.ts`; keep metadata-only action IDs, commands, search topics, descriptions, examples, and `bindable: false` behavior unchanged.
- [x] 2.4 Update `test/diagnostic-actions.test.ts`, `test/config.test.ts`, and `test/prompt-transform-actions.test.ts` for the lean diagnostic action shape and preserved rejection of `vimmode.*` IDs from bindable action config.
- [x] 2.5 Move read-only popup command parser examples and docs anchors out of `src/keybinding-discovery-popup.ts` into test/dev metadata; keep runtime popup builders and `:keybindings` / `:features keybindings` behavior unchanged.
- [x] 2.6 Inspect `ReadOnlyPopup` consumers and remove `docsAnchor` from `src/read-only-popup.ts` plus popup builders/tests if it has no real runtime consumer; otherwise document the remaining runtime need and leave only that field.
- [x] 2.7 Remove recipe/preset docs anchor fields from `src/action-keybinding-recipes.ts`; keep recipe IDs, summaries, action configs, expected bindings, preset expansion, and runtime discovery output unchanged.

## 3. Behavior Preservation

- [x] 3.1 Run focused runtime-help and popup tests proving `:help`, `:features`, `:keybindings`, `:messages`, and `:vimmode inspect` output still works through existing bounded popup/message paths.
- [x] 3.2 Run focused customization diagnostics tests proving `:actions`, `:keymap`, `:mapcheck`, and `:vimdoctor` still search/report effective runtime state and keep diagnostic/help IDs non-bindable.
- [x] 3.3 Run recipe/preset config tests proving `piVimMode.keymap.actions` examples and `piVimMode.keymap.actionPresets` still resolve exactly as before with no default action bindings.

## 4. Build and Metadata Verification

- [x] 4.1 Run `bun run build` and inspect `dist/index.js` for removed drift-only strings such as `openspec/specs/`, `test/`, `specAnchor`, and `testAnchors`.
- [x] 4.2 Compare public runtime outputs before/after where useful, using existing tests or focused snapshots, to confirm user-facing help/diagnostic text did not lose supported topics or non-goal wording.
- [x] 4.3 Keep user docs content unchanged unless an anchor maintenance edit is required; if docs change, rerun docs drift tests and verify README remains a quickstart/index.

## 5. Final Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate strip-runtime-metadata --strict`.
- [x] 5.6 Run `openspec validate --specs --strict`.
