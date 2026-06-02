---
title: Vim behavior contracts drifted from live adapter behavior
date: 2026-05-28
last_updated: 2026-06-02
category: docs/solutions/logic-errors
module: pi-vimmode
problem_type: logic_error
component: tooling
symptoms:
  - "Configured mark behavior was not preserved through live `VimEditor` construction"
  - "Configured prompt-native structure and transform behavior was not preserved through live `VimEditor` construction"
  - "Line edits and prompt-native text objects had edge-case drift from Vim-style contracts"
  - "README and settings docs drifted from actual supported Vim behavior"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - "testing_framework"
  - "documentation"
tags:
  - "vim-mode"
  - "behavior-contracts"
  - "vim-editor"
  - "config-propagation"
  - "prompt-structures"
  - "prompt-transforms"
  - "dot-repeat"
  - "openspec"
---

# Vim behavior contracts drifted from live adapter behavior

## Problem

`pi-vimmode` had behavior contracts that passed through pure parser/config/modal paths but drifted in live `VimEditor` integration. Mark configuration was resolved correctly but dropped before the live editor used it. Later, prompt-native structure and transform configuration repeated the same failure mode: `resolveVimOptions()` produced correct settings, but `VimEditor` cloned only part of `ResolvedVimEditorOptions`, so live editor behavior ignored disabled prompt structure targets and renamed or disabled transform commands.

The same change set also exposed smaller behavior-contract drifts: `dil` on list items could join unrelated lines, `:reflow` could rewrite code when the visual range started inside an existing fence, text-object key config allowed impossible multi-key bindings, and docs still listed supported commands as unsupported.

## Symptoms

- `piVimMode.marks.enabled: false` was not honored by live `VimEditor` instances.
- Restricted mark slots were not honored by live `VimEditor` instances.
- `piVimMode.promptStructures.targets.codeFence: false` parsed correctly, but live `dif` could still operate on code fences.
- Renamed transform commands such as `piVimMode.promptTransforms.commands.quote: ["qte"]` parsed correctly, but live `:qte` did not work unless the clone preserved prompt transform options.
- Disabled transform actions such as `reflow: false` parsed correctly, but live `:reflow` could still run.
- `dd` followed by `.` did not repeat a line delete at the current line.
- `cc` followed by `.` did not repeat a line change and re-enter insert mode.
- `dil` on a single-line list item deleted the item content plus the following newline, joining the next line onto the list marker.
- Visual `:reflow` inside an existing Markdown code fence treated the selected code line as prose when the selected range did not include the fence delimiters.
- README or settings limitations described some now-supported behavior, such as `:nohlsearch`, as unsupported.

## What Didn't Work

- Fixing config parsing alone was insufficient. `src/config.ts` could resolve mark, prompt structure, and prompt transform settings correctly, while `VimEditor` still dropped those branches during option cloning.
- Pure config tests were not enough. They proved `resolveVimOptions()` returned the intended object, not that live `VimEditor` constructed modal state and Ex parsing with that object.
- Treating line commands as generic normal commands was the wrong repeat model. `dd` and `cc` are parsed as doubled operator line commands, not as character commands or operator-motion pairs.
- Treating every prompt-structure delete like a whole-line delete was too broad. Inner list item content starts after the list marker, so consuming a following newline changes unrelated text.
- Reflowing only the selected slice lost lexical context. Fence preservation depends on whether the selected range starts inside a fence opened on an earlier line.
- Allowing multi-key text-object kind/target bindings contradicted the implemented grammar (`operator + kind key + target key`). Without prefix states, multi-key bindings parse but cannot execute predictably.

## Solution

### Preserve every live option branch

Keep `cloneOptions()` aligned with `ResolvedVimEditorOptions`. When adding a new option family, clone it here and add at least one live editor test that proves the option changes runtime behavior.

```ts
function cloneOptions(options: ResolvedVimEditorOptions): ResolvedVimEditorOptions {
  return {
    startMode: options.startMode,
    cursor: { ...options.cursor },
    keymap: options.keymap,
    ui: options.ui,
    macros: options.macros,
    marks: options.marks,
    search: options.search,
    promptStructures: options.promptStructures,
    promptTransforms: options.promptTransforms,
  };
}
```

For prompt-native config, add a live editor regression that exercises the actual adapter path rather than only `resolveVimOptions()`:

```ts
const { editor } = createEditor({
  ...DEFAULT_VIM_OPTIONS,
  startMode: "normal",
  promptStructures: {
    ...DEFAULT_VIM_OPTIONS.promptStructures!,
    targets: { ...DEFAULT_VIM_OPTIONS.promptStructures!.targets, codeFence: false },
  },
  promptTransforms: {
    ...DEFAULT_VIM_OPTIONS.promptTransforms!,
    actions: { ...DEFAULT_VIM_OPTIONS.promptTransforms!.actions, reflow: false },
    commands: { ...DEFAULT_VIM_OPTIONS.promptTransforms!.commands, quote: ["qte"] },
  },
});
```

### Keep repeat state semantic

Give repeat state a line-command variant instead of forcing `dd` and `cc` through unrelated command shapes:

```ts
export type RepeatableChange =
  | { type: "command"; command: VimCommandAction; count?: number; char?: string }
  | { type: "lineCommand"; operator: VimOperatorAction; count?: number }
  | { type: "operatorMotion"; operator: VimOperatorAction; motion: VimMotionAction; count?: number }
  | {
      type: "operatorTextObject";
      operator: VimOperatorAction;
      textObject: VimTextObject;
      count?: number;
    };
```

Record successful line deletes and changes only when they actually edit the prompt buffer:

```ts
if (recordRepeat)
  edited = withRepeatableChange(edited, { type: "lineCommand", operator, count }, result.changed);
```

Replay line commands through the same semantic path, with repeat recording disabled so `.` does not churn its own repeat state:

```ts
if (change.type === "lineCommand") {
  return applyLineCommand(state, snapshot, options, change.operator, change.count, false);
}
```

### Preserve prompt-structure boundaries precisely

Only consume a following newline when the prompt-structure range itself is whole-line. Inner list item ranges start after the marker text, so deleting them should not join the next line.

```ts
if (structureRange) {
  let endExclusive = structureRange.endExclusive;
  const wholeLineRange = structureRange.start === 0 || text[structureRange.start - 1] === "\n";
  if (wholeLineRange && endExclusive < text.length && text[endExclusive] === "\n") {
    endExclusive++;
  }
  // delete [structureRange.start, endExclusive)
}
```

### Preserve fence context for reflow

Track whether the selected range starts inside an existing fence and seed `reflowLines()` with that state.

```ts
function startsInsideFence(lines: readonly string[], startLine: number): boolean {
  let inFence = false;
  for (let index = 0; index < startLine; index++) {
    if (/^\s*(```|~~~)/.test(lines[index] ?? "")) inFence = !inFence;
  }
  return inFence;
}

replacement = reflowLines(
  selected,
  transform.width ?? 80,
  startsInsideFence(lines, safeRange.startLine),
);
```

Keep a regression for visual subranges inside existing fences:

```ts
test("reflow preserves selected subranges inside existing code fences", () => {
  const text = "intro\n```ts\nconst value = some very long expression here\n```\noutro";
  const result = applyPromptTransform(
    text,
    { startLine: 2, endLine: 2 },
    { action: "reflow", width: 12 },
    p(2, 0),
  );

  expect(result).toMatchObject({ ok: true, edit: { text, changed: false } });
});
```

### Make public config types match runtime merge behavior

Use editor-facing nested partial types for prompt config instead of shallow `Partial<Resolved...>` types:

```ts
export type VimPromptStructureEditorOptions = {
  enabled?: boolean;
  targets?: Partial<Record<PromptStructureTarget, boolean>>;
};

export type VimPromptTransformEditorOptions = {
  enabled?: boolean;
  actions?: Partial<Record<PromptTransformAction, boolean>>;
  commands?: Partial<Record<PromptTransformAction, readonly string[]>>;
};

export type VimEditorOptions = {
  promptStructures?: VimPromptStructureEditorOptions;
  promptTransforms?: VimPromptTransformEditorOptions;
};
```

### Validate text-object keymap limits

Text-object kind and target bindings are single-key slots in the current parser. Reject multi-key entries at config load time and include text-object bindings in cross-group conflict warnings so operator motions such as `dw` cannot be hijacked silently.

```ts
textObjects.kinds = parseKeyBindings(
  value.textObjects.kinds,
  TEXT_OBJECT_KIND_SET,
  sourceLabel,
  "textObjects.kinds",
  warnings,
  { singleKeyOnly: true },
);
textObjects.targets = parseKeyBindings(
  value.textObjects.targets,
  TEXT_OBJECT_TARGET_SET,
  sourceLabel,
  "textObjects.targets",
  warnings,
  { singleKeyOnly: true },
);
```

### Keep docs and implementation synchronized

When Ex support changes, update both feature docs and settings limitations. In this case `:noh` / `:nohlsearch` became supported, so settings docs should describe highlight clearing instead of listing `:nohlsearch` as unsupported.

## Why This Works

`VimEditor` now passes the full resolved behavior configuration into modal state decisions and Ex command parsing. `marksForOptions(options)`, `promptStructuresForOptions(options)`, and `promptTransformsForOptions(options)` see the caller-provided branches, so disabled features, restricted slots, renamed commands, and disabled transforms affect live behavior.

Line commands now remain semantic across record and replay. `dd` and `cc` are stored as `lineCommand` repeatable changes, then replayed through `applyLineCommand()`. That preserves linewise register behavior, cursor placement, count handling, and insert-mode transition for `cc`.

Prompt-structure deletion now distinguishes whole-line ranges from inner character ranges. That preserves Vim-like deletion convenience for whole blocks without corrupting list-item structure.

Reflow now uses the surrounding buffer to decide whether the selected range begins inside a fence. That keeps code protected even when the selected range does not include the opening and closing fence lines.

Text-object config validation now matches the implemented grammar. Unsupported multi-key bindings fail early with warnings instead of producing unreachable parser states.

## Prevention

- Any new `VimEditorOptions` field should be added to `cloneOptions()` and covered by a live `VimEditor` test.
- Do not treat pure parser/config tests as evidence of live editor behavior. Pair pure tests with at least one adapter-level assertion for each new option family.
- Any new edit that `.` should replay needs a matching `RepeatableChange` representation; do not force it into a nearby but inaccurate command shape.
- Keep prompt-structure range deletion explicit about whether the range is whole-line or inner character content.
- For range transforms such as reflow, decide whether behavior depends on context outside the selected lines. If it does, pass enough full-buffer context into the pure helper.
- Keep keymap config validation aligned with parser grammar. If the parser has no prefix state for a binding class, reject multi-key bindings for that class.
- Update README and `docs/settings.md` limitations during behavior-contract changes so docs describe the prompt buffer contract, not stale roadmap assumptions.

Regression tests to keep:

- `VimEditor` honors disabled/restricted marks.
- `VimEditor` honors disabled prompt-native structure targets.
- `VimEditor` honors renamed and disabled prompt transform commands.
- Dot repeat replays `dd` and `cc` line commands semantically.
- `dil` does not join unrelated following lines.
- `:reflow` preserves selected subranges inside existing code fences.
- Text-object keymap rejects multi-key kind/target bindings.
- Cross-group keymap conflict warnings include text-object bindings.
- Documented nested prompt config examples typecheck.

Validation used for the latest fix:

- `bun test` — 259 pass
- `bun run check-types`
- `bun run lint`
- `bun run format:check`
- `openspec validate prompt-native-structure-editing --strict`

## Related Issues

- `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md` — related config-source-of-truth guidance for `VimEditorOptions` behavior. This doc should stay aligned with new option families such as search, prompt structures, and prompt transforms.
- `docs/solutions/architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md` — related prompt-buffer API pattern for keeping range/edit mechanics inside `src/buffer.ts`.
- `docs/solutions/architecture-patterns/pi-vimmode-finite-ex-line-commands-architecture-2026-06-01.md` — related finite Ex parser / buffer / modal architecture; relevant to prompt transforms and `:nohlsearch` docs.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — broader modal parser / buffer / adapter architecture pattern.
- `docs/solutions/logic-errors/visual-line-paste-swallowed-by-modal-handler-2026-05-27.md` — related modal-routing bug pattern for commands swallowed by mode-specific handlers.
