---
title: Keep editor factory lifecycle extension agnostic
date: 2026-07-13
category: docs/solutions/integration-issues
module: pi-vimmode
problem_type: integration_issue
component: tooling
symptoms:
  - "pi-vimmode replaced another extension's editor factory."
  - "Lifecycle restoration depended on foreign wrapper internals."
root_cause: wrong_api
resolution_type: code_fix
severity: medium
related_components:
  - "editor-component-lifecycle"
  - "testing_framework"
tags:
  - "pi-vimmode"
  - "editor-factory"
  - "lifecycle"
  - "extension-integration"
---

# Keep editor factory lifecycle extension agnostic

## Problem

Pi exposes one active editor factory through `getEditorComponent()` and
`setEditorComponent()`. `pi-vimmode` must not inspect or mutate another
extension's private factory properties to preserve a wrapper chain.

## Solution

Use only Pi's public factory API:

```ts
const current = ctx.ui.getEditorComponent();
if (current === editorFactory) return;

previousEditorFactory = current;
ctx.ui.setEditorComponent(editorFactory);
```

Disable restores the exact factory that Vim replaced, but only when Vim still
owns the active slot:

```ts
if (ctx.ui.getEditorComponent() === editorFactory) {
  ctx.ui.setEditorComponent(previousEditorFactory);
}
```

No extension names, shared Symbols, reflection, or foreign property mutation.

## Consequences

Pi still has one editor-factory slot. Vim installs when it owns the slot or
when Pi has reset it, but preserves a foreign factory that took ownership after
Vim. Explicit `/vimmode on` may take the slot again. Preserving nested
composition requires a future Pi-owned registration or decorator API; it cannot
be inferred safely from the public two-method API.

## Prevention

- Treat `getEditorComponent()` as an opaque value.
- Never scan Symbol properties on foreign functions.
- Restore only state still owned by this extension.
- Test replacement, reinstallation, and foreign takeover paths.
- Run `bun test`, `bun run check-types`, and `bun run lint` after lifecycle changes.
