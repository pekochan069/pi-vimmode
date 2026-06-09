## Why

pi-vimmode already has semantic Vim keymap customization and prompt-native Ex transforms, but users cannot bind keys directly to finite prompt transform actions such as reflow, fence, quote, or bulletize. This change adds named prompt transform action keybindings so Vim muscle memory can reshape agent prompts without introducing full Vimscript, plugins, recursive mappings, or broad Neovim parity.

## What Changes

- Add a typed prompt transform action registry for canonical `prompt.transform.*` action IDs.
- Add `piVimMode.keymap.actions` for binding normal/visual mode keys to finite built-in prompt transform actions.
- Support parameterized action bindings for existing deterministic transform args, including `fence.language` and `reflow.width`.
- Resolve action bindings at config load time into accepted entries and diagnostics warnings for rejected entries.
- Integrate action keybindings into the existing `src/commands.ts` modal resolver so counts, pending prefixes, conflicts, and invalid input stay deterministic.
- Dispatch accepted prompt transform actions through existing prompt transform edit helpers.
- Reuse one action arg validator from both Ex transform commands and keymap action bindings.
- Update diagnostics/docs only for bindable prompt transform actions in this milestone, including canonical `prompt.transform.*` IDs and one-release searchable aliases for legacy `promptTransform.*` diagnostics.
- Add full config, resolver, modal, Ex validation, diagnostics, docs drift, and package artifact tests.
- No breaking changes: existing `piVimMode.keymap.*` groups and `piVimMode.promptTransforms.commands` stay valid.

Non-goals for this change:

- No full Vim/Neovim command registry.
- No `vimmode.*` diagnostic action registry entries in the first code PR.
- No first-pass or full Neovim quickref matrix in the first code PR.
- No runtime `:map` or `:action` command.
- No user-defined action/plugin API.
- No recursive mappings, leader-key presets, Vimscript, or Lua runtime.
- No rectangular visualBlock transforms; visualBlock actions operate linewise over touched lines.

## Capabilities

### New Capabilities

- `prompt-transform-action-keybindings`: Canonical prompt transform action IDs, bindable action keymap config, resolved action bindings, and modal dispatch contracts.

### Modified Capabilities

- `vim-keymap-configuration`: Add `piVimMode.keymap.actions`, conflict/rejection behavior, and action binding merge semantics.
- `prompt-native-structure-editing`: Existing prompt transform edit behavior becomes invokable from keybound actions as well as Ex ranges.
- `vim-ex-command-line`: Existing Ex transform arg parsing reuses shared action validation with keymap action args.
- `vim-customization-diagnostics`: Diagnostics expose canonical prompt transform action IDs and rejected action binding warnings.
- `runtime-help-drift-guard`: Docs/runtime tests validate prompt transform action registry anchors and alias behavior.
- `pi-vimmode-documentation`: User docs describe `keymap.actions`, examples, non-goals, release notes, and package verification.

## Impact

Affected code seams:

- `src/prompt-transform-actions.ts` — new typed prompt transform action registry and shared arg validation.
- `src/types.ts` — bindable action IDs and resolved action binding types.
- `src/config.ts` — parse `keymap.actions`, validate args, reject protected/conflicting keys, precompute accepted action bindings, and emit diagnostics warnings for rejected entries.
- `src/commands.ts` — add action result type through the existing count/prefix/pending resolver.
- `src/modal/engine.ts` — dispatch action results to existing prompt transform helpers.
- `src/ex.ts` — reuse shared action arg validation for Ex transform args.
- `src/customization.ts` and `src/runtime-help.ts` — surface canonical prompt transform action IDs, current bindings, warnings, and one-release aliases.
- `docs/features.md` and `docs/settings.md` — document config, examples, non-goals, validation, and release verification; `README.md` remains a quickstart/docs index and only links to the detailed docs if needed.

Tests:

- Config parsing and merge/rejection tests for string, object, invalid, protected, duplicate, project-over-global, and empty-array cases.
- Resolver tests for normal action dispatch, counts, prefixes, grammar conflicts, and action/action conflicts.
- Modal tests for current line, counted line ranges, visual char/line/block touched-line transforms, and non-repeatability with `.`.
- Ex tests proving `:fence`/`:reflow` and keymap action args share validation.
- Diagnostics/runtime-help/docs drift tests for canonical IDs, legacy aliases, accepted/rejected keys, and examples.
- Release gate includes `bun run build` and package contents inspection in addition to existing test/type/lint/format checks.

Dependencies:

- No new runtime dependencies.
- No peer dependency changes.

Compatibility:

- Existing keymap groups and Ex transform command names remain supported.
- Existing diagnostic queries using `promptTransform.*` remain searchable for one release as aliases, while new docs and output prefer canonical `prompt.transform.*` IDs.
