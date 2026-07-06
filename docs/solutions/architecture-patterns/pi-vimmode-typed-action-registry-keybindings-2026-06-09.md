---
title: Pi vimmode typed action registry keybindings
date: 2026-06-09
last_updated: 2026-07-01
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding configurable keybindings for finite prompt transform actions"
  - "Keeping action metadata typed across resolver, modal execution, Ex validation, docs, and package checks"
  - "Preventing drift between OpenSpec, implementation, tests, and published docs"
  - "Supporting both Ex positional args and keymap object args for the same action"
  - "Adding trusted JS config bindings that must respect protected Pi shortcuts, mode scopes, and project overrides"
related_components:
  - development_workflow
  - testing_framework
  - documentation
tags:
  - pi-vimmode
  - action-registry
  - keybindings
  - prompt-transforms
  - config-validation
  - runtime-help
  - openspec
  - package-contents
---

# Pi vimmode typed action registry keybindings

## Context

`pi-vimmode` needed configurable normal/visual-mode keybindings for prompt transform actions such as quote, fence, indent, dedent, and reflow. The risk was not the line transformations themselves — those already existed — but adding another action surface that could drift across config parsing, command resolution, modal execution, Ex commands, diagnostics, docs, tests, and package contents.

The completed `typed-action-registry-keybindings` OpenSpec change used a typed finite registry as the source of truth for bindable prompt transform actions. The implementation added canonical `prompt.transform.*` IDs, `piVimMode.keymap.actions`, shared Ex/keymap argument validation, runtime help and diagnostics alignment, docs drift tests, and package dry-run verification.

Prior session history confirmed the main product decision: center this on bindable prompt actions/transforms, not Vim or Neovim parity. It also identified the main pitfalls: existing `promptTransforms.actions`, diagnostics `:actions`, and new `keymap.actions` all use action language but mean different things; parameterized keybindings need an explicit resolved binding shape; and package output inspection needed to be part of verification (session history).

The 2026-07-01 `trusted-js-prompt-keybindings` follow-up extended the same pattern to trusted global JS config. Review fixes made JS remaps respect protected Pi shortcuts, project JSON overrides, mode-scoped conflicts, valid remap modes, `/vimmode reload`, and Ex-command macro replay such as `:vimdoctor<CR>`.

## Guidance

Use a typed metadata registry plus the existing resolver and edit primitive. Do not build a parallel command system.

1. **Keep prompt transform action metadata in one registry.** `src/prompt-transform-actions.ts` owns canonical IDs, short transform names, descriptions, modes, targets, arg schemas, count behavior, visual behavior, repeatability, and docs anchors.

   ```ts
   export const PROMPT_TRANSFORM_ACTIONS = [
     entry("quote", "Quote prompt lines", "Prefix prompt lines with Markdown quote markers."),
     entry("fence", "Fence prompt lines", "Wrap prompt lines in a Markdown code fence.", [
       {
         name: "language",
         type: "string",
         required: false,
         description: "Optional code fence language without whitespace.",
       },
     ]),
     entry("reflow", "Reflow prompt prose", "Reflow prompt prose to a target width.", [
       {
         name: "width",
         type: "integer",
         required: false,
         description: "Optional prose width from 20 through 240 columns.",
       },
     ]),
   ] as const satisfies readonly PromptTransformActionEntry[];
   ```

   Keep this registry descriptive. Do not put dispatch functions or text surgery in it.

2. **Use canonical bindable IDs in config.** `piVimMode.keymap.actions` is a flat record keyed by `prompt.transform.*` IDs. Entries can be bare strings or `{ key, args }` objects.

   ```json
   {
     "piVimMode": {
       "keymap": {
         "actions": {
           "prompt.transform.reflow": ["gq", { "key": "gQ", "args": { "width": 100 } }],
           "prompt.transform.fence": [{ "key": "gT", "args": { "language": "ts" } }],
           "prompt.transform.quote": [{ "key": "g>" }]
         }
       }
     }
   }
   ```

   Keep `piVimMode.promptTransforms.commands` separate. It remains the Ex command-name config surface. Canonical `prompt.transform.*` IDs are required for config and diagnostics. Legacy `promptTransform.*` names were a transition-only compatibility surface and are now removed: they are not config keys, not diagnostic search aliases, and not displayed in keybinding catalogs.

   Keep `vimmode.*` diagnostic/help IDs separate too. IDs such as `vimmode.doctor` are metadata-only quickref entries for discovery surfaces; they are not bindable prompt transform actions and must be rejected from `piVimMode.keymap.actions`.

   ```json
   {
     "piVimMode": {
       "keymap": {
         "actions": {
           "vimmode.doctor": ["gd"]
         }
       }
     }
   }
   ```

   Expected diagnostic:

   ```text
   unsupported piVimMode.keymap.actions.vimmode.doctor
   ```

   Pressing `gd` should do nothing. That no-op is correct because `vimmode.doctor` is metadata-only, not an executable keybinding.

3. **Resolve action bindings before modal dispatch.** `src/config.ts` parses and resolves action keybindings into accepted `{ key, actionId, args }` entries plus diagnostics warnings. Reject invalid entries per key, not per whole action, so valid siblings remain available.

   Reject:
   - protected Pi shortcuts,
   - unknown or non-canonical IDs in config,
   - invalid or unknown args,
   - disabled prompt transform actions,
   - duplicate keys across different actions,
   - exact grammar conflicts,
   - prefix-shadow conflicts with existing command grammar.

   After the `remove-legacy-prompt-transform-aliases` cleanup, do not special-case legacy alias warnings. `promptTransform.reflow` should fail the same way as any other unsupported action ID:

   ```text
   unsupported piVimMode.keymap.actions.promptTransform.reflow
   ```

   That generic rejection is intentional. Keeping canonical-specific hints after alias removal keeps the old surface alive in diagnostics and tests.

4. **Treat trusted JS config as another typed keymap layer, not a privileged bypass.** `src/config-js.ts` may accept ergonomic builder calls such as `vim.keymap.set("n", "ZE", "i<Esc><Tab>")`, but it still feeds the same resolved keymap shape and protection rules as JSON config.

   Required guardrails:
   - reject protected Pi shortcut lhs values with `protectedShortcutForKey(...)`, even from trusted JS config;
   - validate JS remap modes against the same normal/visual/visualLine/visualBlock set used by modal dispatch;
   - remove global JS remaps when project JSON binds the same key;
   - dedupe action bindings by action ID, key, mode set, and args instead of key alone;
   - reject duplicate action keys only when their configured modes overlap;
   - make `keymapHasBinding(key, mode)` check action and remap mode ownership before deciding whether a protected shortcut should delegate to Pi.

   ```ts
   const protectedShortcut = protectedShortcutForKey(normalizedLhs);
   if (protectedShortcut) {
     state.warnings.push(
       warning(`keymap lhs contains protected key ${normalizedLhs} (${protectedShortcut.reason})`),
     );
     return;
   }
   ```

   Mode-aware conflict behavior should allow the same lhs in disjoint modes and reject it in overlapping modes. This prevents both false conflicts and silent shadowing.

5. **Route through the existing command resolver.** `src/commands.ts` returns an action result from the same finite parser that already owns counts, pending prefixes, operator state, macro recording, and invalid-key behavior.

   ```ts
   | {
       type: "action";
       actionId: BindablePromptTransformActionId;
       args: PromptTransform;
       count?: number;
     }
   ```

   Avoid a second resolver inside `src/modal/engine.ts`. That would split prefix handling and make `g`-prefix behavior, counts, macros, and conflict rules drift.

6. **Dispatch actions by reusing prompt transform primitives.** `src/modal/actions.ts` computes normal or visual touched-line ranges, then calls existing `applyPromptTransform(...)`. Normal counts extend the line range; visual counts are ignored; visual-block transforms touched lines linewise rather than rectangular cells.

   ```txt
   key input
     -> src/commands.ts resolveNormalCommand(...)
     -> { type: "action", actionId, args, count? }
     -> src/modal/engine.ts
     -> src/modal/actions.ts
     -> applyPromptTransform(...)
   ```

7. **Share Ex and keymap arg validation.** `normalizePromptTransformActionArgs(...)` accepts both Ex positional input and keymap object input, so `:reflow 72` and `{ "width": 72 }` pass or fail the same way.

   ```ts
   normalizePromptTransformActionArgs({
     source: "ex",
     action: "reflow",
     rest: "72",
   });

   normalizePromptTransformActionArgs({
     source: "keymap",
     actionId: "prompt.transform.reflow",
     args: { width: 72 },
   });
   ```

8. **Test the right surface for each action family.** Manual QA for bindable `prompt.transform.*` actions should exercise normal/visual keybindings and prompt edits. Manual QA for diagnostic/help `vimmode.*` metadata should exercise discovery, help, real Ex commands, and rejection from keymap config.

   Diagnostic quickref smoke test:

   ```vim
   :actions vimmode
   :actions vimmode.doctor
   :keymap vimmode.doctor
   :features vimmode.doctor
   :help diagnostics
   :help actions
   :vimdoctor
   ```

   Expected:
   - `:actions`, `:keymap`, and `:features` show `vimmode.doctor` as `metadata-only not bindable`.
   - `:help diagnostics` and `:help actions` explain the diagnostic/help metadata boundary.
   - `:vimdoctor` is the real executable diagnostic command.
   - `:vimmode doctor` is invalid; only `:vimmode inspect` exists under the `vimmode` Ex command.

9. **Keep M1 deliberately finite.** This change intentionally did not add Vimscript, recursive mappings, a plugin API, runtime `:map`, runtime `:action`, quickref parity, or dot-repeat for keybound prompt transform actions. Keybound prompt transform edits are not dot-repeatable in M1.

10. **Retire compatibility aliases completely once the transition window ends.** Alias removal must cover every user-facing and source-backed surface together:

- delete alias helper exports from `src/prompt-transform-actions.ts`,
- remove config parser special-cases in `src/config.ts`,
- remove diagnostic aliases from `src/customization.ts`,
- update `docs/features.md` and `docs/settings.md` to say canonical-only,
- add drift guards so user docs cannot reintroduce `promptTransform.*` support claims,
- keep canonical dispatch behavior covered by existing normal/visual, macro, and dot-repeat tests.

11. **Verify package contents, not only tests.** The registry is runtime source, so release verification must include `bun run build` and `bun pm pack --dry-run`. The package should include `index.ts`, `src/index.ts`, `src/prompt-transform-actions.ts`, `dist/index.js`, README, and docs.

## Why This Matters

This pattern prevents three kinds of drift.

**Metadata drift:** action IDs, docs anchors, args, target modes, and repeatability live in `src/prompt-transform-actions.ts` instead of being re-described differently in config, docs, diagnostics, and tests.

**Resolver drift:** action keybindings use the same `src/commands.ts` finite grammar as existing commands. Counts, shared prefixes such as `g`, macro recording, invalid pending sequences, protected shortcuts, and operator state stay coherent.

**Validation drift:** Ex commands and keymap bindings share one normalizer for `fence` and `reflow` args. Typos such as `{ "columns": 72 }` reject instead of silently becoming default reflow behavior.

The result is user-configurable prompt transform keybindings without implying full Vim mapping semantics or introducing a plugin runtime.

## When to Apply

- Adding configurable keybindings for finite prompt-local actions.
- Adding action metadata that must appear in config validation, diagnostics, runtime help, docs, and drift tests.
- Explaining or testing the boundary between bindable `prompt.transform.*` actions and metadata-only `vimmode.*` diagnostic/help actions.
- Supporting one behavior through multiple surfaces such as Ex commands, trusted JS remaps, project JSON overlays, and normal/visual keybindings.
- Extending `pi-vimmode` without accepting full Vimscript, recursive mapping, or plugin API scope.
- Adding parameterized keybindings where validation must reject unknown keys and invalid values.
- Removing a retired compatibility alias from config, diagnostics, docs, and tests without changing canonical behavior.

Do not use this pattern for open-ended user scripting, recursively expanded mappings, arbitrary plugin dispatch, or behavior that needs a separate grammar outside the existing modal command resolver. Do not treat diagnostic/help `vimmode.*` IDs as keybinding smoke tests; they are discovery and rejection fixtures.

## Examples

### Resolved binding shape

```ts
[
  { key: "gq", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
  {
    key: "gQ",
    actionId: "prompt.transform.reflow",
    args: { action: "reflow", width: 100 },
  },
  {
    key: "gT",
    actionId: "prompt.transform.fence",
    args: { action: "fence", language: "ts" },
  },
];
```

### Canonical-only alias retirement

Before transition cleanup, `promptTransform.*` aliases existed as diagnostics-only search aliases. After the cleanup, every surface should use only `prompt.transform.*`:

```ts
expect(promptTransformActionForId("prompt.transform.reflow")).toBe("reflow");
expect(promptTransformActionForId("promptTransform.reflow")).toBeUndefined();
```

```ts
expect(runtimeFeaturesMessage("prompt.transform.reflow", context)).toContain("gq");
expect(runtimeFeaturesMessage("promptTransform.reflow", context)).toBe(
  "features: no match for promptTransform.reflow",
);
```

Config warnings should also be generic unsupported-ID warnings, not migration hints:

```text
unsupported piVimMode.keymap.actions.promptTransform.reflow
```

The important invariant is that canonical accepted bindings still dispatch through the same action path. Alias removal should not touch normal/visual execution, search highlight clearing, register and mark preservation, macro replay, or the M1 rule that keybound prompt transform actions do not update dot-repeat.

### Good conflict behavior

- JS `vim.keymap.set("n", "<C-p>", "j")` rejects because `<C-p>` is a protected Pi shortcut.
- A JS remap on `z` is removed when project JSON binds `z` to a command, so project config can override trusted global defaults.
- `prompt.transform.quote` on `zq` in normal mode and `prompt.transform.unquote` on `zq` in visual mode can coexist because their modes do not overlap.
- A visual action on `z` is not shadowed by a normal-mode `zq` prefix because protected-delegation checks are mode-aware.
- Remaps with invalid modes such as `insert` reject during config resolution.
- `prompt.transform.reflow: ["gq"]` can share non-executable prefix `g` with existing `gg`.
- `prompt.transform.quote: ["gg"]` rejects because `gg` is an existing grammar command.
- `prompt.transform.quote: ["g"]` rejects because it prefix-shadows longer grammar/action sequences.
- `prompt.transform.quote: ["gq"]` and `prompt.transform.reflow: ["gq"]` reject as cross-action duplicates.
- Duplicate `gq` entries inside the same action dedupe.

### Test map

Use tests at each boundary instead of one broad integration test:

- Bindable prompt transform registry and arg validation: `test/prompt-transform-actions.test.ts`
- Metadata-only diagnostic/help registry: `test/diagnostic-actions.test.ts`
- Config parsing and conflict/rejection behavior: `test/config.test.ts`
- Resolver counts and prefixes for bindable actions: `test/commands.test.ts`
- Modal normal/visual dispatch and macro replay for bindable actions: `test/modal.test.ts`
- Diagnostics/read-only reporting and `metadata-only not bindable` labels: `test/customization.test.ts`, `test/runtime-help.test.ts`
- Docs/source alignment and bindable-exclusion drift guards: `test/docs-drift.test.ts`
- Live option cloning: `test/vim-editor.test.ts`

## Related

- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — broader finite parser / buffer helper architecture for Vim-style prompt editing.
- `docs/solutions/architecture-patterns/pi-vimmode-finite-ex-line-commands-architecture-2026-06-01.md` — finite Ex parser and prompt transform range architecture.
- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md` — related registry/docs/spec/test anchor pattern for runtime discovery.
- `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md` — config propagation and live `VimEditor` drift lessons for prompt transforms.
- `docs/solutions/logic-errors/pi-vimmode-customization-diagnostics-edge-cases-2026-06-04.md` — diagnostic action metadata should respect resolved enabled/disabled settings.
- `docs/solutions/tooling-decisions/pi-extension-root-source-dist-publish-fields-2026-06-04.md` — package `files` and dry-run inspection guard for published extension contents.
- `openspec/changes/archive/2026-06-11-remove-legacy-prompt-transform-aliases/` — follow-up cleanup that removed transition-only `promptTransform.*` aliases from config, diagnostics, docs, and tests.
- `openspec/changes/typed-action-registry-keybindings/` — source change proposal, design, specs, and completed task checklist.

## Validation

The 2026-07-01 trusted JS keybinding follow-up was verified with:

```bash
bun test
bun run check-types
bun run lint
bun run format:check
openspec validate trusted-js-prompt-keybindings --strict
openspec validate --specs --strict
graphify update . --force
```

Final result: 732 tests passed; OpenSpec strict validation passed for the active change and all 20 specs; the graph was updated after code changes.

The original implementation and documentation were verified with:

```bash
bun test
bun run check-types
bun run lint
bun run format:check
bun run build
bun pm pack --dry-run
openspec validate typed-action-registry-keybindings --strict
openspec validate --specs --strict
```

Final result for the original registry change: 396 tests passed, OpenSpec reported 53/53 tasks complete, and package dry-run included the extension entrypoint, runtime source, generated build, README, and docs.

The 2026-06-11 alias-retirement update was verified with:

```bash
bun test
bun run check-types
bun run lint
bun run format:check
openspec validate --specs --strict
```

Final result: 463 tests passed, OpenSpec specs validated 20/20, and both active OpenSpec changes were archived.
