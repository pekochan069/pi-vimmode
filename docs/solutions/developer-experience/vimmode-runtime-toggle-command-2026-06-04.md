---
title: Runtime Toggle Command for Pi Vimmode
date: 2026-06-04
category: developer-experience
module: pi-vimmode
problem_type: developer_experience
component: tooling
severity: low
applies_when:
  - "A Pi extension replaces the main prompt editor and needs an in-session recovery path"
  - "A CustomEditor should be disabled temporarily without uninstalling or restarting Pi"
related_components:
  - documentation
  - development_workflow
tags: [pi-extension, vimmode, custom-editor, lifecycle, recovery]
---

# Runtime Toggle Command for Pi Vimmode

## Context

`pi-vimmode` replaces Pi's main prompt editor with a Vim-style `CustomEditor`. Before the runtime toggle, recovery guidance required removing or uninstalling the extension and restarting Pi when the editor blocked input or configuration went wrong.

That recovery path worked, but it was too heavy for normal development: testing editor lifecycle changes should not require uninstalling the extension, and users need a quick escape hatch when modal editing gets in the way.

## Guidance

Register a Pi slash command that owns only runtime enablement state, not package installation state. The command should restore the editor component that existed before `pi-vimmode` installed, and re-run normal lifecycle installation when re-enabled.

Key lifecycle state:

```ts
type EditorComponentFactory = ReturnType<ExtensionContext["ui"]["getEditorComponent"]>;

let enabled = true;
let previousEditorFactory: EditorComponentFactory;
```

Install path respects disabled state and captures the previous editor before replacing it:

```ts
const installEditor = (ctx: ExtensionContext) => {
  if (!enabled) {
    ctx.ui.setStatus("pi-vimmode", "vim off");
    return;
  }
  refreshOptions(ctx);
  if (ctx.ui.getEditorComponent() !== editorFactory) {
    previousEditorFactory = ctx.ui.getEditorComponent();
    ctx.ui.setEditorComponent(editorFactory);
  }
};
```

Disable path resets tracked Vim editor cursor hints and restores the previous editor only when `pi-vimmode` is still active:

```ts
const disableEditor = (ctx: ExtensionContext) => {
  enabled = false;
  resetKnownEditors();
  if (ctx.ui.getEditorComponent() === editorFactory) {
    ctx.ui.setEditorComponent(previousEditorFactory);
  }
  ctx.ui.setStatus("pi-vimmode", "vim off");
};
```

Command surface stays small and predictable:

```ts
pi.registerCommand("vimmode", {
  description: "Toggle pi-vimmode editor on/off",
  handler: async (args, ctx) => {
    const action = args.trim().toLowerCase() || "toggle";
    if (action === "status") {
      ctx.ui.notify(`pi-vimmode ${enabled ? "enabled" : "disabled"}`, "info");
      return;
    }
    if (action !== "toggle" && action !== "on" && action !== "off") {
      ctx.ui.notify("Usage: /vimmode [on|off|toggle|status]", "warning");
      return;
    }

    if (action === "on" || (action === "toggle" && !enabled)) enableEditor(ctx);
    else disableEditor(ctx);

    ctx.ui.notify(`pi-vimmode ${enabled ? "enabled" : "disabled"}`, "info");
  },
});
```

Document the command beside existing uninstall recovery instructions:

- `/vimmode off` restores Pi's previous editor for the current extension runtime.
- `/vimmode on` or `/vimmode` enables the Vim editor again.
- `pi remove`/`pi uninstall` remains the persistent package removal path.

## Why This Matters

Runtime toggles are safer than configuration edits for editor-replacement extensions. They preserve Pi's extension installation, avoid restart loops, and give users a low-friction escape hatch if the modal editor becomes unusable.

The important design detail is restoring the previous editor component rather than setting an arbitrary fallback. That keeps `pi-vimmode` composable with Pi defaults and with any editor component that was active before it installed.

## When to Apply

- When a Pi extension replaces `ctx.ui` editor behavior globally.
- When disabling should last only for the current extension runtime.
- When recovery should not require changing Pi package settings.
- When re-enabling should reuse the same install path as normal lifecycle hooks.

## Examples

Test through the public lifecycle and command interface instead of internal state:

```ts
test("vimmode command toggles editor off and on", async () => {
  const { hooks, commands } = createLifecycleHarness();
  const ctx = createContext("/repo");

  hooks.get("agent_end")?.({}, ctx);
  const factory = ctx.ui.setCalls[0]!;

  await commands.get("vimmode")?.handler("", ctx);

  expect(ctx.ui.component).toBeUndefined();
  expect(ctx.ui.statuses.at(-1)).toEqual(["pi-vimmode", "vim off"]);
  expect(ctx.ui.notifications.at(-1)).toEqual(["pi-vimmode disabled", "info"]);

  await commands.get("vimmode")?.handler("", ctx);

  expect(ctx.ui.component).toBe(factory);
  expect(ctx.ui.statuses.at(-1)).toEqual(["pi-vimmode", "vim"]);
  expect(ctx.ui.notifications.at(-1)).toEqual(["pi-vimmode enabled", "info"]);
});
```

Verification commands used for this change:

```sh
bun test test/lifecycle.test.ts
bun test
bun run build
bunx oxfmt --check src/lifecycle.ts test/lifecycle.test.ts README.md docs/features.md
```

## Related

- `src/lifecycle.ts` — extension activation, settings refresh, `/vimmode` command, shutdown cursor reset.
- `test/lifecycle.test.ts` — lifecycle harness and runtime toggle coverage.
- `docs/features.md#disable-or-recover` — user-facing recovery path.
- `README.md#recover-or-disable` — quick recovery command reference.
