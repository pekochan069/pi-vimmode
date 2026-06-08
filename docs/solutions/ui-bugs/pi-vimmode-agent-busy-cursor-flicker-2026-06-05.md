---
title: Pi vimmode cursor flickers during agent work
date: 2026-06-05
category: docs/solutions/ui-bugs
module: pi-vimmode
problem_type: ui_bug
component: tooling
symptoms:
  - "Bar insert cursor flickered while assistant or tool output rendered"
  - "Pi TUI hardware cursor stayed visible during agent render churn"
  - "Cursor visibility behavior differed between interactive editing and agent work"
root_cause: async_timing
resolution_type: code_fix
severity: medium
related_components:
  - renderer
  - pi-tui
  - development_workflow
tags:
  - pi-vimmode
  - cursor-flicker
  - hardware-cursor
  - agent-lifecycle
  - tui
---

# Pi vimmode cursor flickers during agent work

## Problem

`pi-vimmode` enabled Pi TUI's hardware cursor for configured `bar` cursor style so insert mode could show a real vertical cursor. During agent work, frequent assistant and tool renders kept that hardware cursor visible, producing cursor flicker even though the user was not actively editing the prompt.

## Symptoms

- Cursor flickered while the agent was working or streaming output.
- Flicker was tied to agent activity rather than normal prompt editing.
- `bar` cursor style still needed the hardware cursor while interactive; hiding it globally would regress visible insert-mode cursor behavior.

## What Didn't Work

- Hiding the hardware cursor globally would have regressed the previous `bar` cursor fix; interactive `bar` still needs Pi TUI hardware cursor visibility.
- Changing render output was the wrong seam. The fake cursor and `CURSOR_MARKER` paths were already width-safe; the problem was lifecycle timing for hardware cursor visibility.

## Solution

Add an explicit agent busy/idle cursor policy owned by the Pi adapter and lifecycle layer.

`src/vim-editor.ts` now tracks whether agent work is active:

```ts
private agentBusy = false;

setAgentBusy(active: boolean): void {
  if (this.agentBusy === active) return;
  this.agentBusy = active;
  this.syncHardwareCursorVisibility(this.getCurrentCursorStyle());
}
```

Hardware cursor visibility now suppresses the real terminal cursor while busy, then restores the normal `bar`/original-visibility policy when idle:

```ts
private syncHardwareCursorVisibility(style: CursorStyle): void {
  if (this.agentBusy) {
    this.setHardwareCursorVisibility(false);
    return;
  }
  this.setHardwareCursorVisibility(
    style === "bar" || this.originalHardwareCursorVisible === true,
  );
}
```

`src/lifecycle.ts` tracks current agent state and applies it to tracked editors. The editor factory also applies the current busy state to editors created while an agent turn is already running.

```ts
let agentBusy = false;
const editors = new Set<TrackedEditor>();

const setKnownEditorsAgentBusy = (active: boolean) => {
  agentBusy = active;
  for (const editor of editors) editor.setAgentBusy(active);
};
```

The lifecycle hooks mark editors busy on agent start and idle on agent end without replacing the editor component during `agent_start`:

```ts
pi.on("agent_start", () => {
  setKnownEditorsAgentBusy(true);
});

pi.on("agent_end", (_event, ctx) => {
  setKnownEditorsAgentBusy(false);
  installEditor(ctx);
});
```

Shutdown and `/vimmode off` reset tracked cursor state, so the terminal does not keep a forced visible cursor after disabling or exiting.

## Why This Works

The previous bar-cursor fix needed two states to line up: DECSCUSR cursor shape and Pi TUI hardware cursor visibility. That remains true while the prompt is interactive.

The flicker happened because the same hardware cursor visibility stayed enabled during a different interaction state: agent work. Pi continued to position the hardware cursor at render markers while assistant and tool output churned.

The new policy separates those contexts:

- Interactive + `bar`: show hardware cursor so the bar cursor is visible.
- Agent busy: hide hardware cursor to avoid flicker during output churn.
- Agent end: restore the cursor policy for the editor's current Vim mode.
- Shutdown or `/vimmode off`: restore original terminal cursor visibility and reset shape hints.

Keeping this in `VimEditor` and `src/lifecycle.ts` preserves module boundaries. Rendering stays width-safe and modal editing behavior does not need to know about Pi agent events.

## Prevention

- Keep hardware cursor visibility policy centralized in `VimEditor.syncHardwareCursorVisibility(...)`.
- Use lifecycle events to express runtime interaction state; do not reinstall the editor during `agent_start` just to hide a cursor.
- Apply current lifecycle busy state to editors created while the agent is already busy.
- Preserve and restore Pi TUI's original hardware cursor visibility rather than assuming hidden or visible defaults.
- Cover cursor lifecycle with tests:
  - interactive `bar` cursor enables hardware cursor visibility,
  - agent busy suppresses hardware cursor without changing prompt text or mode,
  - agent idle restores current cursor policy,
  - shutdown and `/vimmode off` reset tracked editors,
  - reset paths restore original cursor visibility.

Validation commands used for the fix:

```sh
bun test
bun run check-types
bun run lint
bun run format:check
openspec validate --specs --strict
```

## Related Issues

- `docs/solutions/ui-bugs/pi-vimmode-bar-cursor-hardware-cursor-hidden-2026-05-29.md` — predecessor fix that made `bar` cursor visible by enabling Pi TUI hardware cursor visibility.
- `docs/solutions/developer-experience/pi-vimmode-auto-activation-2026-05-26.md` — related lifecycle ownership and stable editor factory guidance.
- `docs/solutions/developer-experience/vimmode-runtime-toggle-command-2026-06-04.md` — related `/vimmode off` reset and recovery path.
- `openspec/changes/fix-todos-cursor-flicker/` — OpenSpec proposal, design, specs, and completed task checklist for this fix.
