## 1. OpenSpec Contract

- [x] 1.1 Validate proposal/design/specs agree on reduced M1 scope: bindable prompt transform actions only, no `vimmode.*` diagnostic registry, no quickref matrix.
- [x] 1.2 Confirm each spec scenario maps to at least one implementation or test task below.

## 2. Registry and Shared Validation

- [x] 2.1 Add `src/prompt-transform-actions.ts` with prompt transform action registry entries for quote, unquote, bulletize, fence, indent, dedent, and reflow.
- [x] 2.2 Add registry metadata fields for canonical ID, title, description, category, modes, targets, args, count behavior, visual behavior, repeatability, and docs anchor; do not put edit dispatch functions in the registry.
- [x] 2.3 Derive `PromptTransformActionId` from the registry constant, keep existing short-name `PromptTransformAction` for transform internals, and expose `BindablePromptTransformActionId` for config-bindable prompt transform actions.
- [x] 2.4 Add resolved action binding types including `{ key, actionId, args }`; store accepted bindings in resolved keymap state and rejected binding messages in `VimDiagnostics.warnings`.
- [x] 2.5 Implement shared action arg validation that accepts Ex positional input and keymap object input, producing normalized `PromptTransform` data.
- [x] 2.6 Add unit tests for unique IDs, bindable-vs-metadata-only IDs, arg schemas, valid fence/reflow args, invalid fence/reflow args, unknown arg rejection, and no-arg transform rejection.

## 3. Config Parsing and Action Binding Resolution

- [x] 3.1 Extend public editor option types with `piVimMode.keymap.actions` as a flat canonical action ID record whose array entries are key strings or `{ key, args }` objects.
- [x] 3.2 Extend default/clone/merge paths so action keymap state exists in live `VimEditor` options without mutating unrelated keymap groups.
- [x] 3.3 Add `parseActionBindings(...)` helper for string entries, `{ key, args }` entries, empty arrays, unknown IDs, invalid args, and protected keys.
- [x] 3.4 Add `resolveActionBindings(...)` helper that computes accepted action entries and diagnostics warnings after global/project merge, including disabled prompt transform action filtering.
- [x] 3.5 Deduplicate repeated keys within one action; reject duplicate keys across different actions and reject action keys that duplicate or prefix-shadow existing grammar bindings; reject per key entry, not per whole action.
- [x] 3.6 Add config tests for no default action keybindings, accepted string entry, accepted `{ key }` entry, accepted `{ key, args }` entry, mixed default/parameterized entries for one action, same-action duplicate dedupe, unknown ID warning, legacy alias rejection with canonical warning, invalid args warning, unknown args warning, disabled action warning, protected key warning, project-over-global replacement, empty-array unbind, exact grammar conflict rejection, prefix-shadow conflict rejection, allowed shared non-executable prefix such as `gq` with `gg`, cross-action duplicate rejection, and sibling config preservation.

## 4. Resolver Integration

- [x] 4.1 Extend `SemanticCommandResult` with an action result carrying `actionId`, normalized args, and optional count.
- [x] 4.2 Include accepted action bindings in the existing binding lookup path in `src/commands.ts` without creating a parallel resolver.
- [x] 4.3 Ensure counts flow through action resolution for sequences such as `3gq`.
- [x] 4.4 Ensure multi-key prefixes such as `g` wait deterministically for action sequences such as `gq`.
- [x] 4.5 Preserve existing operator, motion, command, char-command, text-object, macro, and mark behavior.
- [x] 4.6 Add resolver tests for normal action dispatch, counted action dispatch, shared prefix pending (`g` for `gq`/`gg`), invalid pending action sequence, action key not usable as operator target, action key not usable after register prefix, grammar conflict behavior, prefix-shadow rejection behavior, same-action duplicate dedupe, cross-action duplicate rejection, and legacy command preservation.

## 5. Modal Dispatch and Prompt Transform Application

- [x] 5.1 Dispatch action results in normal mode by computing current-line ranges by default; counts extend to counted line ranges, including for reflow.
- [x] 5.2 Dispatch action results in visual, visualLine, and visualBlock modes using touched prompt lines, ignoring visual-mode numeric counts, and returning to normal mode after recognized visual action keybindings.
- [x] 5.3 Reuse `applyPromptTransform(...)` for all action edits; do not duplicate quote/fence/reflow text surgery in modal code.
- [x] 5.4 Preserve registers, marks, repeat-search history, message history on successful edits, protected shortcut delegation, insert-mode behavior, and adapter effects except for the intentional edit result; clear visible prompt search highlights on changed action edits and ensure macros record/replay action key sequence input through the current resolver.
- [x] 5.5 Ensure keybound prompt transform actions are not recorded as dot-repeatable changes in M1.
- [x] 5.6 Add modal tests for normal current-line transform, counted line-range transform, parameterized fence language, parameterized reflow width, visual character touched-lines transform, visual-line transform, visual-block touched-lines transform, visual-count ignored behavior, visual action exits normal after recognized action, macro record/replay of action keys, silent changed action edits, unchanged result no-op feedback, unsupported target error/no-op feedback, and non-repeatability with `.`.

## 6. Ex Command-Line Integration

- [x] 6.1 Refactor Ex transform arg parsing to call the shared action validator for fence and reflow.
- [x] 6.2 Preserve current Ex command names and `piVimMode.promptTransforms.commands` behavior.
- [x] 6.3 Add Ex tests proving `:fence ts` and keymap `{ language: "ts" }` share validation, invalid fence language rejects consistently, `:reflow 72` and keymap `{ width: 72 }` share validation, invalid reflow width rejects consistently, and no-arg transforms reject unexpected args consistently.

## 7. Diagnostics, Runtime Help, and Aliases

- [x] 7.1 Update prompt transform diagnostics to prefer canonical `prompt.transform.*` IDs.
- [x] 7.2 Keep legacy `promptTransform.*` queries searchable as aliases for one release.
- [x] 7.3 Update `:actions`, `:keymap`, `:mapcheck`, and `:features <transform>` output for accepted action bindings, exact canonical ID formatting without duplicate kind prefixes, and rejected action key warnings.
- [x] 7.4 Ensure `:vimdoctor` includes retained action binding warnings.
- [x] 7.5 Keep diagnostics read-only for prompt text, cursor, mode, visual selection, search highlights, registers, marks, macros, and dot-repeat state.
- [x] 7.6 Add diagnostics/runtime-help tests for canonical IDs, no duplicate `promptTransform.` prefix in canonical output, legacy aliases, accepted key reporting in `:actions`/`:keymap`/`:mapcheck`/`:features`, rejected key reporting, and read-only behavior.

## 8. Documentation and Drift Guards

- [x] 8.1 Document `piVimMode.keymap.actions` in `docs/settings.md`, including flat canonical action IDs, string entries, `{ key, args }` entries, protected shortcuts, warnings, and examples.
- [x] 8.2 Document named prompt transform action examples in `docs/features.md` and keep README limited to quickstart/docs-index links if touched.
- [x] 8.3 Document that `piVimMode.promptTransforms.commands` remains the Ex command-name config surface.
- [x] 8.4 Document that canonical `prompt.transform.*` IDs are required in config and legacy `promptTransform.*` aliases are temporary diagnostic/search aliases only.
- [x] 8.5 Document M1 non-goals: no Vimscript, recursive mappings, plugin API, `:map`, `:action`, quickref parity, or rectangular visualBlock transforms.
- [x] 8.6 Add drift tests that every public prompt transform action ID appears in docs, every documented action ID exists in the registry, docs anchors exist, example `keymap.actions` config parses, and aliases remain covered until cleanup.

## 9. Maintainability and Release Verification

- [x] 9.1 Keep new parser/resolver logic in focused helpers; do not bloat `parseKeymap`, `resolveWithoutPending`, or `parseTransformArgs` past the repo line-count rule.
- [x] 9.2 Fix `package.json` package contents if needed so the published package includes the extension entrypoint and runtime source/build output, not docs only.
- [x] 9.3 Add or update release checklist documentation to include `bun run build` and package contents inspection.
- [x] 9.4 Verify package contents include the extension entry and new registry source using `bun pm pack --dry-run`.

## 10. Validation

- [x] 10.1 Run `bun test`.
- [x] 10.2 Run `bun run check-types`.
- [x] 10.3 Run `bun run lint`.
- [x] 10.4 Run `bun run format:check`.
- [x] 10.5 Run `bun run build`.
- [x] 10.6 Run `bun pm pack --dry-run` and inspect package contents.
- [x] 10.7 Run `openspec validate typed-action-registry-keybindings --strict`.
- [x] 10.8 Run `openspec validate --specs --strict`.
