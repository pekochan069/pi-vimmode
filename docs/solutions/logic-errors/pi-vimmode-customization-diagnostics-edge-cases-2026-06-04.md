---
title: Pi vimmode customization diagnostics edge cases
date: 2026-06-04
category: docs/solutions/logic-errors
module: pi-vimmode
problem_type: logic_error
component: tooling
symptoms:
  - "`:mapcheck <C-r>` did not resolve the default `ctrl+r` redo binding"
  - "`piVimMode.preset: minimal` still showed macro and mark entries in diagnostic commands"
  - "Runtime diagnostics advertised actions that were unavailable in the effective config"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - "keymap-configuration"
  - "vim-ex-command-line"
  - "vim-ui-configuration"
  - "testing_framework"
tags:
  - "pi-vimmode"
  - "customization"
  - "diagnostics"
  - "mapcheck"
  - "presets"
  - "shortcut-normalization"
  - "macro-config"
  - "mark-config"
---

# Pi vimmode customization diagnostics edge cases

## Problem

`pi-vimmode` customization diagnostics drifted from the effective runtime configuration in two places. `:mapcheck <C-r>` failed to identify the redo binding because the diagnostic path understood `ctrl+r` but not Vim angle notation, and the `minimal` preset still exposed macro/mark actions through `:keymap` and `:actions` even though those feature families were disabled.

## Symptoms

- `:mapcheck <C-r>` reported no useful match instead of `mapcheck: ctrl+r -> command.redo`.
- `:keymap macro` under `piVimMode.preset: "minimal"` still showed macro bindings such as `q` and `@`.
- `:actions mark` under `minimal` still surfaced mark actions even though marks were disabled.
- Diagnostic commands described the raw keymap table, not the effective action surface available to the user.

## What Didn't Work

- Lowercasing and trimming shortcut text was not enough. It preserved `<C-r>` as `<c-r>`, which could never match the canonical keymap entry `ctrl+r`.
- Treating the keymap as the complete action registry was too broad. The resolved keymap still contains macro and mark binding tables even when `macros.enabled` or `marks.enabled` disables behavior.
- Testing only default diagnostics missed preset-specific drift. The default config has macros and marks enabled, so `:keymap macro` looked correct until tested under `minimal`.

## Solution

Normalize Vim angle modifier notation before matching shortcuts. Existing aliases remain in the helper, but the important fix is the angle-notation path:

```ts
const normalized = key.trim().toLowerCase();
const angleMatch = /^<([^>]+)>$/.exec(normalized);
const canonical = angleMatch?.[1]
  ? angleMatch[1]
      .split("-")
      .map((part) => (part === "c" ? "ctrl" : part === "s" ? "shift" : part))
      .join("+")
  : normalized;
```

Make diagnostic action registry functions accept the resolved macro and mark settings, not just the keymap:

```ts
export function actionEntriesForKeymap(
  keymap: ResolvedVimKeymap,
  promptTransforms?: ResolvedVimPromptTransforms,
  macros?: ResolvedVimMacros,
  marks?: ResolvedVimMarks,
): VimActionEntry[] {
  // existing command, motion, operator, text object, and transform entries omitted

  if (macros?.enabled !== false) {
    for (const [id, keys] of Object.entries(keymap.macros)) {
      entries.push({ id: `macro.${id}`, kind: "macro", description: `${id} macro`, keys });
    }
  }

  if (marks?.enabled !== false) {
    for (const [id, keys] of Object.entries(keymap.marks)) {
      entries.push({ id: `mark.${id}`, kind: "mark", description: `${id} mark`, keys });
    }
  }

  return entries;
}
```

Pass the effective settings from the modal Ex diagnostic path:

```ts
const transforms = promptTransformsForOptions(options);
const macros = macrosForOptions(options);
const marks = marksForOptions(options);

const message =
  parsed.command === "keymap"
    ? keymapMessage(keymap, parsed.query, transforms, macros, marks)
    : actionsMessage(keymap, parsed.query, transforms, macros, marks);
```

Add regression coverage for both failures:

```ts
expect(mapcheckMessage(keymap, "<C-r>")).toBe("mapcheck: ctrl+r -> command.redo");

const { options } = resolveVimOptions(undefined, { piVimMode: { preset: "minimal" } });
const resolvedKeymap = keymapForOptions(options);
expect(keymapMessage(resolvedKeymap, "macro", undefined, options.macros, options.marks)).toBe(
  "keymap: no match for macro",
);
expect(actionsMessage(resolvedKeymap, "mark", undefined, options.macros, options.marks)).toBe(
  "actions: no match for mark",
);
```

## Why This Works

`mapcheckMessage()` compares the queried key against canonical keymap entries. Converting Vim notation into the same canonical form (`<C-r>` → `ctrl+r`) makes user-facing Vim syntax and internal config syntax converge before lookup.

`keymapMessage()` and `actionsMessage()` are not raw config dumps; they are runtime diagnostics. Passing `ResolvedVimMacros` and `ResolvedVimMarks` lets them reflect what the user can actually do after presets and explicit config are resolved. This keeps diagnostic commands aligned with behavior instead of leaking disabled implementation tables.

## Prevention

- Treat diagnostics as effective-runtime views, not raw configuration views.
- When adding a preset that disables a feature family, assert both `:actions <feature>` and `:keymap <feature>` return no match.
- When accepting user-entered key names, test both canonical config syntax (`ctrl+r`) and common Vim notation (`<C-r>`).
- Keep the Ex diagnostic path wired to every resolved option branch it summarizes.
- Run focused checks after customization changes:

```sh
bun test test/customization.test.ts test/modal.test.ts
bun run check-types
bun run format:check
```

## Related Issues

- `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md` — related live-config drift pattern where parsed/resolved options did not fully reach runtime behavior.
- `docs/solutions/architecture-patterns/pi-vimmode-prompt-local-linear-redo-2026-06-04.md` — related `ctrl+r` redo binding and adapter-owned redo behavior.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — related finite keybinding parser and semantic keymap architecture.
- `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md` — related config source-of-truth and diagnostic consistency guidance.
