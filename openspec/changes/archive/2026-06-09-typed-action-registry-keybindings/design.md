## Context

pi-vimmode already has three foundations this change should reuse:

- Semantic keymap config in `src/config.ts` / `src/types.ts` for operators, motions, commands, macros, marks, text objects, and operator motions.
- Modal grammar in `src/commands.ts` for counts, pending prefixes, operators, motions, text objects, macro parser handoff, and deterministic invalid input.
- Prompt transform commands in `src/ex.ts` and `src/buffer.ts`, where finite Ex commands parse args and call `applyPromptTransform(...)` over prompt line ranges.

The gap: users can configure Ex command names through `piVimMode.promptTransforms.commands`, but cannot bind normal/visual keys directly to prompt transform actions with stable canonical IDs.

This design adds a typed prompt transform action registry without pretending pi-vimmode is a full Neovim runtime. The first code PR is deliberately reduced: bindable prompt transform actions only. Broader diagnostic action registry entries and quickref classification are deferred.

## Goals / Non-Goals

**Goals:**

- Add canonical bindable prompt transform action IDs: `prompt.transform.quote`, `prompt.transform.unquote`, `prompt.transform.bulletize`, `prompt.transform.fence`, `prompt.transform.indent`, `prompt.transform.dedent`, `prompt.transform.reflow`.
- Add `piVimMode.keymap.actions` config as a flat record from canonical action ID to an array of string-or-object binding entries.
- Validate `fence.language` and `reflow.width` through one shared validator used by Ex commands and action keymap config.
- Precompute accepted action bindings and rejected-entry diagnostics during config resolution.
- Resolve action keybindings through `src/commands.ts`, not a parallel resolver in `src/modal/engine.ts`.
- Dispatch keybound prompt transforms through existing buffer transform helpers.
- Preserve existing keymap groups, Ex transform command names, Pi protected shortcuts, insert-mode delegation, dot-repeat behavior, macro state, visual state, search state, registers, and marks.
- Expose canonical `prompt.transform.*` IDs in diagnostics/docs, while keeping legacy `promptTransform.*` search aliases for one release.
- Add complete tests and package artifact verification.

**Non-Goals:**

- No full Vim/Neovim action registry.
- No `vimmode.*` diagnostic action registry entries in the first code PR.
- No quickref classification in the first code PR.
- No runtime `:map` or `:action` command.
- No recursive mappings, leader-key presets, Vimscript, Lua, or user-defined action/plugin API.
- No rectangular visualBlock transform semantics. VisualBlock actions operate linewise over touched lines.
- No default keymap generation from the registry.

## Decisions

### Decision 1: Registry is prompt-transform-first

Add `src/prompt-transform-actions.ts` with prompt transform action metadata and shared validation. The registry describes actions and normalizes args; it does not execute prompt edits. `src/customization.ts` remains the diagnostic formatter and protected-shortcut explanation seam, importing prompt transform action metadata from `src/prompt-transform-actions.ts`. Do not migrate command/motion/operator metadata in this change.

Rejected alternatives:

- Full keymap registry now: too broad and violates the approved M1 scope.
- Dispatch-only registry: creates another metadata island and leaves diagnostics/docs stale.

### Decision 2: Bindable IDs are separate from all registry IDs

Define a canonical bindable prompt transform action ID type for config-bindable prompt transforms. Keep the existing short-name `PromptTransformAction` union for transform internals and Ex command aliases.

Sketch:

```ts
export const PROMPT_TRANSFORM_ACTIONS = [
  // prompt.transform.* entries
] as const satisfies readonly PromptTransformActionEntry[];

export type PromptTransformActionId = (typeof PROMPT_TRANSFORM_ACTIONS)[number]["id"];
export type BindablePromptTransformActionId = PromptTransformActionId;
```

Implementation may use a more explicit predicate if future metadata-only prompt transform entries appear.

Rejected alternatives:

- One generic `VimActionId` for all config: would allow future metadata-only IDs like `vimmode.doctor` under `keymap.actions`.
- Plain string IDs: loses most typed registry value.

### Decision 3: Resolved action bindings carry per-key args

Existing keymap groups store `Record<id, string[]>`, but action bindings can attach args per key. User config uses flat canonical action IDs mapped to arrays whose entries are either a key string or an object `{ key, args }`.

```json
{
  "piVimMode": {
    "keymap": {
      "actions": {
        "prompt.transform.reflow": ["gq", { "key": "gQ", "args": { "width": 100 } }],
        "prompt.transform.fence": ["gF", { "key": "gT", "args": { "language": "ts" } }]
      }
    }
  }
}
```

Resolved action bindings must be entries, not string arrays.

```ts
type ResolvedVimActionBinding = {
  key: string;
  actionId: BindablePromptTransformActionId;
  args: Record<string, unknown>;
};

type ResolvedVimActionKeymap = {
  accepted: readonly ResolvedVimActionBinding[];
};

type VimDiagnostics = {
  warnings: readonly string[]; // includes rejected action binding warnings
};
```

`ResolvedVimKeymap` gains `actions: ResolvedVimActionKeymap`.

Rejected alternatives:

- `Record<id, string[]>`: cannot represent `gF` default args and `gT` language args for the same action.
- Sibling `ResolvedVimActions`: adds parameter sprawl to resolver and diagnostics callers.

### Decision 4: Config resolution filters action bindings

Add action parsing helpers instead of expanding `parseKeymap(...)` inline:

```txt
parseKeymap()
  └── parseActionBindings()
        ├── normalize string entries and { key, args } entries
        ├── reject unknown/unbindable IDs
        ├── validate per-key object args
        └── reject protected keys

merge global/project
  └── resolveActionBindings()
        ├── dedupe repeated keys within the same action
        ├── reject duplicate keys across different actions
        ├── reject action keys that duplicate or prefix-shadow existing grammar bindings
        ├── reject entries for disabled prompt transform actions
        ├── preserve per-key accepted entries
        └── return accepted entries plus VimDiagnostics warnings
```

Conflict rejection is per key entry, not per action. If one action has `g>` and `gq`, and only `gq` conflicts, `g>` stays accepted. Action keybindings never override existing grammar automatically; a user must explicitly unbind the existing command, motion, operator, macro, mark, or text-object binding before the action key can claim it. Prefix conflict checks reject keys that would be unexecutable under the resolver or would make an existing executable binding wait for extra input; shared non-executable prefixes such as `g` for both `gg` and `gq` remain valid.

Rejected alternatives:

- Warning-only conflicts: would let rejected actions still dispatch.
- Fatal config errors: too harsh for editor customization; one bad key should not break prompt editing.

### Decision 5: `src/commands.ts` remains modal grammar source of truth

Add an action binding result to `SemanticCommandResult` and include accepted action bindings in the existing binding lookup path. Counts, prefixes, and pending state continue flowing through `resolveNormalCommand(...)`.

```txt
key input
  │
  ▼
resolveNormalCommand(key, pending, keymap)
  │
  ├── existing command/motion/operator/text-object results
  └── { type: "action", actionId, args, count? }
```

Rejected alternatives:

- Resolve actions in `src/modal/engine.ts`: duplicates prefix/count logic and creates shadowing bugs.
- Single-key actions only: avoids resolver work but drops key examples like `gq`.

### Decision 6: Shared transform arg validation normalizes invocation-specific syntax

Ex transform args are positional strings. Keymap action args are objects. `src/prompt-transform-actions.ts` should expose helpers that normalize both forms into the same `PromptTransform` shape.

Example shape:

```ts
type ActionArgInput =
  | { source: "ex"; action: PromptTransformAction; rest: string }
  | { source: "keymap"; actionId: BindablePromptTransformActionId; args: unknown };
```

Both paths produce either `{ ok: true; transform: PromptTransform }` or `{ ok: false; message: string }`. Unknown keymap arg keys reject that binding instead of being ignored, so typos do not silently fall back to default transform behavior.

Rejected alternatives:

- Duplicating validation in config: predictable drift.
- Removing parameterized keybindings: weakens the approved capability.

### Decision 7: Modal dispatch reuses existing transform helpers and preserves side effects

Action dispatch in normal/visual modes computes a line range and calls `applyPromptTransform(...)`.

Range rules:

- Normal linewise transforms, including `reflow` without a count, use the current line.
- Counts extend normal-mode transforms to `current line + count - 1`.
- Visual, visualLine, and visualBlock use touched lines. VisualBlock is not rectangular.
- Numeric counts in visual modes are ignored for action keybindings; selection defines the target and the transform runs once.
- Recognized visual-mode action keybindings return to normal mode and clear the visual selection whether or not the transform changes text, matching existing visual mutating operations.
- Successful changed action edits are silent and do not add retained runtime messages.
- Successful unchanged action results report no-op feedback according to resolved `feedback.noop` settings.
- Failed transform cases show runtime error messages; unsupported/no-op cases use no-op feedback according to resolved `feedback.noop` settings.
- Keybound prompt transforms are not recorded as dot-repeatable in M1.

Side effects that must remain unchanged except for prompt edit/result message:

- registers,
- marks,
- macros record and replay action key sequence input through the current resolver,
- changed text clears visible prompt search highlights, while repeat-search history remains preserved,
- visual state restoration rules,
- Pi protected shortcut delegation,
- insert mode behavior,
- adapter command handling.

### Decision 8: Diagnostics use canonical IDs with temporary aliases

New diagnostics/docs prefer `prompt.transform.*`. Accepted action binding diagnostics print canonical IDs exactly, e.g. `gq -> prompt.transform.reflow`, without adding a duplicate `promptTransform.` kind prefix. `:features <transform>` also reports accepted action keybindings in compact form when bindings exist. Existing `promptTransform.*` diagnostic/search vocabulary remains as alias for one release. `piVimMode.keymap.actions` config accepts canonical `prompt.transform.*` IDs only; legacy aliases in config are rejected with warnings that name the canonical ID.

`promptTransforms.commands` remains the Ex command-name config surface. It does not move into `keymap.actions`. `promptTransforms.actions.<name> = false` disables that prompt transform action through both Ex command names and action keybindings.

Rejected alternatives:

- Hard switch: user-facing churn for current diagnostic queries.
- Keep old IDs publicly: splits config and diagnostics vocabulary.

### Decision 9: Keep central functions small

Do not add large inline branches to `parseKeymap`, `resolveWithoutPending`, or `parseTransformArgs`. Extract focused helpers before functions approach the repo's 100-line rule.

Target helpers:

- `parseActionBindings(...)`
- `resolveActionBindings(...)`
- `actionBindingEntriesForResolver(...)`
- `normalizeActionArgs(...)`
- `actionResultForBinding(...)`

### Decision 10: Validate the shipped artifact

Release validation includes the current commands plus package contents inspection:

```bash
bun test
bun run check-types
bun run lint
bun run format:check
bun run build
bun pm pack --dry-run
openspec validate --specs --strict
```

## Risks / Trade-offs

- **Risk: action key resolver shadows existing grammar** → Mitigation: action bindings resolve through `src/commands.ts`, exact and prefix-shadow conflicts reject at config resolution, same-action duplicates dedupe, and tests cover `g`, `gq`, `gg`, counts, and duplicates.
- **Risk: Ex args and keymap args drift** → Mitigation: shared validator normalizes both invocation forms.
- **Risk: metadata source-of-truth claim becomes false** → Mitigation: prompt transform diagnostics read registry metadata; command/motion/operator registry migration stays explicitly deferred.
- **Risk: `actions` naming is overloaded** → Mitigation: docs explain three surfaces: `promptTransforms.actions` enable/disable booleans, `keymap.actions` bindable key mappings, `:actions` diagnostic command.
- **Risk: old diagnostic IDs disappear** → Mitigation: keep `promptTransform.*` aliases searchable in diagnostics for one release, reject aliases in new config with canonical-ID warnings, and capture cleanup in `TODOS.md`.
- **Risk: central parser/resolver functions grow too large** → Mitigation: helper extraction guard and targeted tests.
- **Risk: package publishes without new source** → Mitigation: build and inspect package contents before publishing.

## Migration Plan

1. Create registry and tests without changing default behavior.
2. Add config parsing, accepted binding resolution, and rejected-entry diagnostics for `keymap.actions`, with no default action keys.
3. Add resolver action result and modal dispatch for prompt transforms.
4. Wire Ex transform args to shared validator.
5. Update transform diagnostics/docs/aliases.
6. Run full validation and package inspection.
7. Release as additive behavior. Existing `piVimMode.keymap.*` and `piVimMode.promptTransforms.commands` remain valid.

Rollback strategy:

- Because no default action keys are added, disabling or removing `keymap.actions` config returns behavior to the previous Ex-only transform surface.
- If diagnostics aliases cause confusion, they can be removed in a follow-up release after docs announce canonical IDs.

## Open Questions

None.
