---
title: Pi vimmode auto activation reliability
date: 2026-05-26
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
---

# Pi vimmode auto activation reliability

## Context

`pi-vimmode` needed to replace Pi's default editor with `VimEditor` automatically. A manual `/vimmode` command proved the extension could load and install the editor, but it was not acceptable product behavior: Vim mode should be active whenever the extension is loaded.

A single `session_start` handler was not reliable enough. In current Pi startup/reload timing, the custom editor install can race with UI context setup or be lost when session/UI resources are refreshed.

## Guidance

Use a stable editor factory, install through more than one lifecycle event, and keep the extension command-free.

```ts
const editorFactory = (
  tui: ConstructorParameters<typeof VimEditor>[0],
  theme: ConstructorParameters<typeof VimEditor>[1],
  keybindings: ConstructorParameters<typeof VimEditor>[2],
) => new VimEditor(tui, theme, keybindings);

const installEditor = (ctx: ExtensionContext) => {
  if (ctx.ui.getEditorComponent() !== editorFactory) {
    ctx.ui.setEditorComponent(editorFactory);
  }
  ctx.ui.setStatus("pi-vimmode", "vim");
};
```

Install immediately and again on the next tick so extension load, resource discovery, and UI setup order do not decide whether Vim mode appears:

```ts
const installEditorSoon = (ctx: ExtensionContext) => {
  installEditor(ctx);
  setTimeout(() => {
    try {
      installEditor(ctx);
    } catch {
      // Expected only when context goes stale during reload/session switch.
      // Prefer narrowing/logging if Pi exposes a stale-context signal.
    }
  }, 0);
};
```

Register multiple lifecycle hooks:

```ts
pi.on("session_start", (_event, ctx) => {
  installEditorSoon(ctx);
});

pi.on("resources_discover", (_event, ctx) => {
  installEditorSoon(ctx);
});

pi.on("agent_end", (_event, ctx) => {
  installEditor(ctx);
});
```

Keep package discovery explicit with a root extension entry (`index.ts` exporting the extension used by `package.json`'s `pi.extensions`).

## Why This Matters

Manual activation commands test extension loading, not automatic UX. If the real extension behavior depends on a slash command, users can install the extension and still see no Vim mode.

Stable factory identity allows idempotent installs; anonymous factories make every event look different.

Multiple hooks cover UI lifecycle gaps: startup, resource discovery/reload timing, and post-agent UI refresh.

## When to Apply

- Pi extension provides a custom editor or UI component that should be active by default.
- Extension discovery works, but the visible UI customization is missing after startup.
- A manual diagnostic command works, but automatic activation remains flaky.
- Reload/session switches can make captured UI context stale.

## Examples

Avoid these activation shortcuts:

- Manual slash command as real activation path: useful diagnostic, poor UX.
- Single `session_start` hook: misses Pi UI reload/resource timing.
- Anonymous editor factory: prevents reliable identity checks.

Verification used for the working implementation:

- `bun run check-types`
- `bun test` with 22 passing tests
- `DefaultResourceLoader` showed handlers `[session_start, resources_discover, agent_end]` and commands `[]`

## Related

- `src/index.ts` — extension lifecycle hook registration and editor install logic
- `src/vim-editor.ts` — custom editor component
- `package.json` — Pi extension discovery entry
- `docs/plans/2026-05-26-001-feat-vim-mode-extension-plan.md` — implementation plan
