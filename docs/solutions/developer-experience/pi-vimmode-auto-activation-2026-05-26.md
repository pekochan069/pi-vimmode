---
title: Pi vimmode auto activation reliability
date: 2026-05-26
last_updated: 2026-05-27
category: docs/solutions/developer-experience
module: pi-vimmode
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - "Pi extension replaces the default editor component"
  - "Extension must activate without a manual slash command"
  - "UI context may reset during startup, reload, or agent lifecycle"
tags:
  - pi-extension
  - vim-mode
  - editor-component
  - auto-activation
  - lifecycle-hooks
  - settings-install
  - module-boundary
---

# Pi vimmode auto activation reliability

## Context

`pi-vimmode` needs to replace Pi's default editor with `VimEditor` automatically. A manual `/vimmode` command proved the extension could load and install the editor, but it was not acceptable product behavior: Vim mode should activate automatically once the extension and UI context are ready.

A single `session_start` handler was not reliable enough. In current Pi startup/reload timing, the custom editor install can race with UI context setup or be lost when session/UI resources are refreshed.

The first reliable version kept this logic inline in `src/index.ts`. As settings support and cursor cleanup grew, that small entrypoint started owning too many concrete responsibilities: stable editor factory identity, settings refresh, delayed reinstall, multi-hook install, stale-context tolerance, and terminal cursor reset. Those responsibilities now live in `src/lifecycle.ts`; `src/index.ts` only delegates to it.

## Guidance

Use a stable editor factory, install through more than one lifecycle event, and keep the extension command-free. When install behavior grows beyond one trivial hook, move editor install state, hook registration, delayed reinstall, settings refresh, and cleanup into `src/lifecycle.ts` instead of letting the entrypoint accumulate runtime state.

### Keep the entrypoint thin

```ts
import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { registerVimLifecycle } from "./lifecycle.ts";

export default function piVimMode(pi: ExtensionAPI) {
  registerVimLifecycle(pi);
}
```

### Put lifecycle state in one module

`src/lifecycle.ts` owns the runtime contract:

- current resolved Vim options,
- one stable editor factory per extension registration,
- created editor tracking for shutdown cleanup,
- settings refresh and warning status updates,
- immediate install and delayed reinstall,
- Pi hook registration.

```ts
let currentOptions = DEFAULT_VIM_OPTIONS;
const editors = new Set<TrackedEditor>();

const editorFactory: VimEditorFactory = (tui, theme, keybindings) => {
  const editor = createEditor(tui, theme, keybindings, currentOptions);
  editors.add(editor);
  return editor;
};

const installEditor = (ctx: ExtensionContext) => {
  const loaded = loadOptions({ cwd: ctx.cwd });
  currentOptions = loaded.options;
  ctx.ui.setStatus("pi-vimmode", loaded.warnings.length > 0 ? "vim ⚠" : "vim");

  if (ctx.ui.getEditorComponent() !== editorFactory) {
    ctx.ui.setEditorComponent(editorFactory);
  }
};
```

### Preserve reload timing explicitly

Install immediately and again on the next tick for hooks whose context can race with UI/resource setup:

```ts
const installEditorSoon = (ctx: ExtensionContext) => {
  installEditor(ctx);
  schedule(() => {
    try {
      installEditor(ctx);
    } catch {
      // Context can go stale during reload/session switch.
      // Next session_start will reinstall.
    }
  });
};
```

Register hooks by intent:

```ts
pi.on("session_start", (_event, ctx) => installEditorSoon(ctx));
pi.on("resources_discover", (_event, ctx) => installEditorSoon(ctx));
pi.on("agent_end", (_event, ctx) => installEditor(ctx));
pi.on("session_shutdown", () => resetKnownEditors());
```

The current implementation swallows delayed reinstall failures after the immediate install succeeds because reload/session switches can stale the context. Immediate install failures should still surface so real startup/config errors are visible.

### Use narrow dependency injection for deterministic tests

Avoid monkeypatching globals or constructing real TUI/editor internals in lifecycle tests. Inject only the seams needed to observe behavior:

```ts
registerVimLifecycle(fakePi, {
  loadOptions: ({ cwd }) => ({ options: optionsFor(cwd), warnings }),
  createEditor: (_tui, _theme, _keys, options) => fakeEditor(options),
  schedule: (callback) => {
    scheduled.push(callback);
  },
});
```

Test the lifecycle contract directly:

- hook timing and delayed reinstall scheduling,
- stable factory identity and idempotent install,
- settings/status refresh and latest options for new editors,
- delayed stale-context handling and shutdown cleanup.

Keep `src/config.ts` pure. It should resolve/load settings and return warnings, not register hooks, install editor components, schedule reload work, or track editor instances.

## Why This Matters

Manual activation commands test extension loading, not automatic UX. If the real extension behavior depends on a slash command, users can install the extension and still see no Vim mode.

Stable factory identity allows idempotent installs; anonymous factories make every event look different and cause unnecessary editor re-registration.

Multiple hooks cover observed startup, resource discovery, and post-agent refresh gaps.

The extraction matters because reload bugs hide in timing and identity. Inline lifecycle code can look simple while encoding fragile behavior. A dedicated module makes install behavior reviewable and testable without a real Pi runtime.

## When to Apply

- Pi extension provides a custom editor or UI component that should be active by default.
- Extension discovery works, but the visible UI customization is missing after startup.
- A manual diagnostic command works, but automatic activation remains flaky.
- Reload/session switches can make captured UI context stale.
- Entrypoint coordinates hooks, settings refresh, delayed reinstall, factory identity, or cleanup.
- Function identity or delayed reinstall behavior is part of correctness.

## Examples

Avoid these activation shortcuts:

- Manual slash command as real activation path: useful diagnostic, poor UX.
- Single `session_start` hook: misses Pi UI reload/resource timing.
- Anonymous editor factory: prevents reliable identity checks.
- Global monkeypatching in tests: makes scheduler/settings behavior brittle.
- Moving lifecycle side effects into config parsing: mixes pure settings resolution with runtime install behavior.

Useful validation after changing the lifecycle seam:

```bash
bun run format
bun run lint
bun test
bun run check-types
```

The lifecycle extraction added `test/lifecycle.test.ts` to cover reload/install behavior directly, while existing config/editor tests continue to cover parsing and editor behavior.

## Related

- `src/index.ts` — thin Pi extension entrypoint.
- `src/lifecycle.ts` — lifecycle hook registration, settings refresh, editor install, delayed reinstall, and shutdown cleanup.
- `src/config.ts` — pure settings load/resolve module.
- `test/lifecycle.test.ts` — lifecycle contract tests.
- `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md` — related settings/config contract.
