---
title: Vim behavior contracts drifted from live adapter behavior
date: 2026-05-28
category: docs/solutions/logic-errors
module: pi-vimmode
problem_type: logic_error
component: tooling
symptoms:
  - "Configured mark behavior was not preserved through live `VimEditor` construction"
  - "`dd` and `cc` line edits did not replay correctly with `.`"
  - "README limitations drifted from actual supported Vim behavior"
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
  - "marks"
  - "dot-repeat"
  - "modal-engine"
  - "openspec"
---

# Vim behavior contracts drifted from live adapter behavior

## Problem

`pi-vimmode` had behavior contracts that passed through some pure modal paths but drifted in live `VimEditor` integration. Mark configuration was resolved correctly but dropped before the live editor used it, and linewise edits such as `dd` and `cc` did not keep enough semantic information for `.` repeat.

## Symptoms

- `piVimMode.marks.enabled: false` was not honored by live `VimEditor` instances.
- Restricted mark slots were not honored by live `VimEditor` instances.
- `dd` followed by `.` did not repeat a line delete at the current line.
- `cc` followed by `.` did not repeat a line change and re-enter insert mode.
- README limitations still described some now-supported behavior as unsupported.

## What Didn't Work

- Fixing config parsing alone was insufficient. `src/config.ts` could resolve mark settings correctly, but `VimEditor` cloned only part of `VimEditorOptions`.
- Treating line commands as generic normal commands was the wrong repeat model. `dd` and `cc` are parsed as doubled operator line commands, not as character commands or operator-motion pairs.
- Pure modal-engine tests alone were not enough. The marks bug lived in adapter construction, so only real `VimEditor` tests could prove the resolved options reached live behavior.

## Solution

Preserve mark options in the live editor option clone:

```ts
function cloneOptions(options: VimEditorOptions): VimEditorOptions {
  return {
    startMode: options.startMode,
    cursor: { ...options.cursor },
    keymap: options.keymap,
    ui: options.ui,
    macros: options.macros,
    marks: options.marks,
  };
}
```

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
  edited = withRepeatableChange(
    edited,
    { type: "lineCommand", operator, count },
    result.changed,
  );
```

Replay line commands through the same semantic path, with repeat recording disabled so `.` does not churn its own repeat state:

```ts
if (change.type === "lineCommand") {
  return applyLineCommand(state, snapshot, options, change.operator, change.count, false);
}
```

Add live editor tests for disabled and restricted mark configuration:

```ts
test("VimEditor honors disabled mark configuration", () => {
  const { editor } = createEditor({
    ...DEFAULT_VIM_OPTIONS,
    startMode: "normal",
    marks: { enabled: false, slots: ["a"] },
  });

  editor.setText("one\n  two");
  typeKeys(editor, ["G", "m"]);
  expect(editor.getPendingOperator()).toBeUndefined();
  expect(editor.getMark("a")).toBeUndefined();
});
```

Add modal-engine tests for linewise dot-repeat:

```ts
test("normal dot repeat applies line delete commands and updates line register", () => {
  const deleted = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree\nfour", cursor, ["d", "d"]);
  expect(deleted.text).toBe("two\nthree\nfour");

  const repeated = applyModalKeys(deleted.state, deleted.text, { line: 1, col: 0 }, ["."]);
  expect(repeated.text).toBe("two\nfour");
});
```

Finally, update README limitations so prompt search and Ex-style command mode stay documented as deferred, while supported counts, text objects, and line-local character search are no longer listed as unsupported.

## Why This Works

`VimEditor` now passes the full resolved behavior configuration into modal state decisions. `marksForOptions(options)` sees the caller-provided `marks` object, so disabled marks short-circuit mark prefixes and restricted slots reject non-configured marks in live editor behavior.

Line commands now remain semantic across record and replay. `dd` and `cc` are stored as `lineCommand` repeatable changes, then replayed through `applyLineCommand()`. That preserves linewise register behavior, cursor placement, count handling, and insert-mode transition for `cc`.

Recording only when `result.changed` is true also prevents no-op commands from replacing the previous useful repeat action.

## Prevention

- Any new `VimEditorOptions` field should be added to `cloneOptions()` and covered by a live `VimEditor` test.
- Any new edit that `.` should replay needs a matching `RepeatableChange` representation; do not force it into a nearby but inaccurate command shape.
- Keep pure modal tests and live adapter tests paired. Pure engine coverage proves semantic decisions; live editor coverage proves option wiring and adapter effects.
- Update README limitations during behavior-contract changes so docs describe the prompt buffer contract, not stale roadmap assumptions.

Validation used for this fix:

- `bun test`
- `bun run check-types`
- `bun run lint`
- `bun run format:check`
- `openspec validate harden-vim-behavior-contracts`

## Related Issues

- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — broader modal parser / buffer / adapter architecture pattern. Related but not a duplicate; this fix adds a concrete repeat-state and option-cloning failure mode.
- `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md` — related config-source-of-truth guidance for `VimEditorOptions` behavior.
- `docs/solutions/logic-errors/visual-line-paste-swallowed-by-modal-handler-2026-05-27.md` — related modal-routing bug pattern for commands swallowed by mode-specific handlers.
