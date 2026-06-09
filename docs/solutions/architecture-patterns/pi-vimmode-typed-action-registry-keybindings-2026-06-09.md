---
title: Pi vimmode typed action registry keybindings
date: 2026-06-09
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

   Keep `piVimMode.promptTransforms.commands` separate. It remains the Ex command-name config surface. Legacy `promptTransform.*` names are diagnostic/search aliases only, not config keys.

3. **Resolve action bindings before modal dispatch.** `src/config.ts` parses and resolves action keybindings into accepted `{ key, actionId, args }` entries plus diagnostics warnings. Reject invalid entries per key, not per whole action, so valid siblings remain available.

   Reject:
   - protected Pi shortcuts,
   - unknown or legacy IDs in config,
   - invalid or unknown args,
   - disabled prompt transform actions,
   - duplicate keys across different actions,
   - exact grammar conflicts,
   - prefix-shadow conflicts with existing command grammar.

4. **Route through the existing command resolver.** `src/commands.ts` returns an action result from the same finite parser that already owns counts, pending prefixes, operator state, macro recording, and invalid-key behavior.

   ```ts
   | {
       type: "action";
       actionId: BindablePromptTransformActionId;
       args: PromptTransform;
       count?: number;
     }
   ```

   Avoid a second resolver inside `src/modal/engine.ts`. That would split prefix handling and make `g`-prefix behavior, counts, macros, and conflict rules drift.

5. **Dispatch actions by reusing prompt transform primitives.** `src/modal/actions.ts` computes normal or visual touched-line ranges, then calls existing `applyPromptTransform(...)`. Normal counts extend the line range; visual counts are ignored; visual-block transforms touched lines linewise rather than rectangular cells.

   ```txt
   key input
     -> src/commands.ts resolveNormalCommand(...)
     -> { type: "action", actionId, args, count? }
     -> src/modal/engine.ts
     -> src/modal/actions.ts
     -> applyPromptTransform(...)
   ```

6. **Share Ex and keymap arg validation.** `normalizePromptTransformActionArgs(...)` accepts both Ex positional input and keymap object input, so `:reflow 72` and `{ "width": 72 }` pass or fail the same way.

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

7. **Keep M1 deliberately finite.** This change intentionally did not add Vimscript, recursive mappings, a plugin API, runtime `:map`, runtime `:action`, quickref parity, or dot-repeat for keybound prompt transform actions. Keybound prompt transform edits are not dot-repeatable in M1.

8. **Verify package contents, not only tests.** The registry is runtime source, so release verification must include `bun run build` and `bun pm pack --dry-run`. The package should include `index.ts`, `src/index.ts`, `src/prompt-transform-actions.ts`, `dist/index.js`, README, and docs.

## Why This Matters

This pattern prevents three kinds of drift.

**Metadata drift:** action IDs, docs anchors, args, target modes, and repeatability live in `src/prompt-transform-actions.ts` instead of being re-described differently in config, docs, diagnostics, and tests.

**Resolver drift:** action keybindings use the same `src/commands.ts` finite grammar as existing commands. Counts, shared prefixes such as `g`, macro recording, invalid pending sequences, protected shortcuts, and operator state stay coherent.

**Validation drift:** Ex commands and keymap bindings share one normalizer for `fence` and `reflow` args. Typos such as `{ "columns": 72 }` reject instead of silently becoming default reflow behavior.

The result is user-configurable prompt transform keybindings without implying full Vim mapping semantics or introducing a plugin runtime.

## When to Apply

- Adding configurable keybindings for finite prompt-local actions.
- Adding action metadata that must appear in config validation, diagnostics, runtime help, docs, and drift tests.
- Supporting one behavior through multiple surfaces such as Ex commands and normal/visual keybindings.
- Extending `pi-vimmode` without accepting full Vimscript, recursive mapping, or plugin API scope.
- Adding parameterized keybindings where validation must reject unknown keys and invalid values.

Do not use this pattern for open-ended user scripting, recursively expanded mappings, arbitrary plugin dispatch, or behavior that needs a separate grammar outside the existing modal command resolver.

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

### Good conflict behavior

- `prompt.transform.reflow: ["gq"]` can share non-executable prefix `g` with existing `gg`.
- `prompt.transform.quote: ["gg"]` rejects because `gg` is an existing grammar command.
- `prompt.transform.quote: ["g"]` rejects because it prefix-shadows longer grammar/action sequences.
- `prompt.transform.quote: ["gq"]` and `prompt.transform.reflow: ["gq"]` reject as cross-action duplicates.
- Duplicate `gq` entries inside the same action dedupe.

### Test map

Use tests at each boundary instead of one broad integration test:

- Registry and arg validation: `test/prompt-transform-actions.test.ts`
- Config parsing and conflict rejection: `test/config.test.ts`
- Resolver counts and prefixes: `test/commands.test.ts`
- Modal normal/visual dispatch and macro replay: `test/modal.test.ts`
- Diagnostics/read-only reporting: `test/customization.test.ts`, `test/runtime-help.test.ts`
- Docs/source alignment: `test/docs-drift.test.ts`
- Live option cloning: `test/vim-editor.test.ts`

## Related

- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — broader finite parser / buffer helper architecture for Vim-style prompt editing.
- `docs/solutions/architecture-patterns/pi-vimmode-finite-ex-line-commands-architecture-2026-06-01.md` — finite Ex parser and prompt transform range architecture.
- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md` — related registry/docs/spec/test anchor pattern for runtime discovery.
- `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md` — config propagation and live `VimEditor` drift lessons for prompt transforms.
- `docs/solutions/logic-errors/pi-vimmode-customization-diagnostics-edge-cases-2026-06-04.md` — diagnostic action metadata should respect resolved enabled/disabled settings.
- `docs/solutions/tooling-decisions/pi-extension-root-source-dist-publish-fields-2026-06-04.md` — package `files` and dry-run inspection guard for published extension contents.
- `openspec/changes/typed-action-registry-keybindings/` — source change proposal, design, specs, and completed task checklist.

## Validation

The implementation and documentation were verified with:

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

Final result: 396 tests passed, OpenSpec reported 53/53 tasks complete, and package dry-run included the extension entrypoint, runtime source, generated build, README, and docs.
