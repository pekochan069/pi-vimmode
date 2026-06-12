---
title: Pi vimmode read-only popup shared seam
date: 2026-06-12
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Extracting generic popup state from feature-specific popup content"
  - "Removing import cycles between modal types, inspectability, and popup content builders"
  - "Sharing read-only popup scroll and message-splitting helpers across modal and overlay code"
  - "Adding lightweight import-boundary guards after architecture cleanup"
related_components:
  - modal-engine
  - editor-adapter
  - testing-framework
  - graphify
tags:
  - pi-vimmode
  - readonly-popup
  - import-boundary
  - modal-effect
  - graphify
  - openspec
  - typescript
---

# Pi vimmode read-only popup shared seam

## Context

`pi-vimmode` had grown several popup-backed read-only surfaces: `:help`, `:features`, `:keybindings`, `:actions`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`, and `:vimmode inspect`. They all used the same bounded popup shape and scroll behavior, but the generic popup contract still lived in `src/keybinding-discovery-popup.ts` beside keybinding-specific content builders.

That ownership was too shallow. `src/keybinding-discovery-popup.ts` imported inspectability helpers from `src/modal/inspect.ts`, `src/modal/inspect.ts` imported modal types, and `src/modal/types.ts` imported `ReadOnlyPopup` back from keybinding-discovery content. Graphify reported this as:

```txt
src/keybinding-discovery-popup.ts -> src/modal/inspect.ts -> src/modal/types.ts -> src/keybinding-discovery-popup.ts
```

The fix was not to move more content into the modal layer. The useful seam was smaller: extract the read-only popup data model and pure helpers into a feature-independent module, then leave command/content builders where they already belonged.

## Guidance

Create a shared seam when a UI model becomes generic across several feature producers. The seam should own only the data shape and pure mechanics; feature modules should still own their source-backed content.

For read-only popups, the seam became `src/read-only-popup.ts`:

```ts
export const HELP_POPUP_BODY_ROWS = 10;

export type ReadOnlyPopupSource =
  | "help"
  | "features"
  | "keybindings"
  | "actions"
  | "keymap"
  | "mapcheck"
  | "vimdoctor"
  | "messages"
  | "inspect";

export type ReadOnlyPopup = {
  title: string;
  lines: readonly string[];
  source: ReadOnlyPopupSource;
  query?: string;
  docsAnchor: string;
  scrollOffset: number;
};
```

Keep pure helpers with the shared shape:

```ts
export function popupFromMessage(input: {
  title: string;
  source: ReadOnlyPopupSource;
  query?: string;
  docsAnchor: string;
  message: string;
}): ReadOnlyPopup {
  return {
    title: input.title,
    source: input.source,
    query: input.query,
    docsAnchor: input.docsAnchor,
    scrollOffset: 0,
    lines: splitPopupMessage(input.message),
  };
}

export function splitPopupMessage(message: string): string[] {
  const lines = message
    .split(/\n|;\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : ["(no output)"];
}

export function scrollHelpPopup(popup: ReadOnlyPopup, delta: number): ReadOnlyPopup {
  const maxOffset = Math.max(0, popup.lines.length - HELP_POPUP_BODY_ROWS);
  const scrollOffset = Math.max(0, Math.min(maxOffset, popup.scrollOffset + delta));
  return scrollOffset === popup.scrollOffset ? popup : { ...popup, scrollOffset };
}
```

Then rewire generic consumers to import the seam, not feature content:

```ts
// src/modal/types.ts
import type { ReadOnlyPopup } from "../read-only-popup.ts";

// src/keybinding-discovery-overlay.ts
import { HELP_POPUP_BODY_ROWS, scrollHelpPopup } from "./read-only-popup.ts";

// src/modal/engine.ts
import { scrollHelpPopup } from "../read-only-popup.ts";
```

Keep compatibility exports in the old module if that avoids broad churn:

```ts
export {
  HELP_POPUP_BODY_ROWS,
  popupFromMessage,
  scrollHelpPopup,
  splitPopupMessage,
  type HelpPopup,
  type ReadOnlyPopup,
  type ReadOnlyPopupSource,
} from "./read-only-popup.ts";
```

Add a narrow import-boundary test instead of a new dependency-cruiser-style tool:

```ts
const consumers = [
  "src/modal/types.ts",
  "src/keybinding-discovery-overlay.ts",
  "src/modal/engine.ts",
];

for (const path of consumers) {
  expect(await Bun.file(path).text()).not.toMatch(/keybinding-discovery-popup\.ts/);
}

expect(await Bun.file("src/read-only-popup.ts").text()).not.toMatch(
  /modal\/inspect|modal\/types|keybinding-discovery-popup|runtime-help|customization/,
);
```

## Why This Matters

Feature-specific modules make poor homes for generic contracts. Once modal types, overlay components, adapter effects, runtime help, diagnostics, message history, and inspectability all depend on the same popup shape, importing that shape through keybinding discovery creates misleading ownership and import-cycle risk.

The shared seam keeps ownership clear:

- `src/read-only-popup.ts` owns popup data and pure mechanics.
- Content modules build popup data but do not own scroll/message mechanics.
- Modal and adapter layers keep existing `openReadOnlyPopup` behavior unchanged.

This preserves prompt-safe popup behavior while removing the cycle.

## When to Apply

- A type or helper is used by multiple feature families but lives inside one feature module.
- Graph or source inspection shows a feature-content module participating in modal/type import cycles.
- A renderer or adapter imports content builders just to get a shared data shape.
- Behavior must stay unchanged, so compatibility exports are cheaper than broad renames.
- The desired guard is an import-direction invariant, not a full dependency analysis framework.

## Examples

Before extraction, modal types depended on keybinding-discovery content just to name popup state:

```ts
// src/modal/types.ts
import type { ReadOnlyPopup } from "../keybinding-discovery-popup.ts";
```

After extraction, modal types depend on the generic seam:

```ts
// src/modal/types.ts
import type { ReadOnlyPopup } from "../read-only-popup.ts";
```

Before extraction, `keybinding-discovery-popup.ts` mixed generic mechanics with feature content:

```ts
export type ReadOnlyPopup = { /* generic popup state */ };
export function scrollHelpPopup(...) { /* generic scroll clamp */ }
export function keybindingDiscoveryPopup(...) { /* keybinding content */ }
export function inspectPopup(...) { /* inspect content */ }
```

After extraction, the split is explicit:

```txt
src/read-only-popup.ts              generic popup contract and helpers
src/keybinding-discovery-popup.ts   source-backed popup content builders
```

Validation should include both behavior and structure:

```bash
bun test
bun run check-types
bun run lint
bun run format:check
openspec validate <change-id> --strict
openspec validate --specs --strict
graphify update .
```

After the change, `graphify-out/GRAPH_REPORT.md` reported:

```txt
## Import Cycles
- None detected.
```

## Related

- `docs/solutions/design-patterns/pi-vimmode-read-only-help-overlay-ui-2026-06-09.md` — real Pi TUI overlay pattern that this seam now supports.
- `docs/solutions/architecture-patterns/pi-vimmode-modal-feature-module-extraction-pattern-2026-06-05.md` — broader modal extraction pattern and `ModalEffect` boundary.
- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md` — source-backed runtime help/docs/spec/test guardrails.
- `docs/solutions/design-patterns/pi-vimmode-actionable-keybinding-catalog-2026-06-10.md` — keybinding popup content producer that should not own generic popup mechanics.
