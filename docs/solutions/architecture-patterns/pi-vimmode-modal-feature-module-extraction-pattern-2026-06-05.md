---
title: Pi vimmode modal feature module extraction pattern
date: 2026-06-05
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Refactoring large modal handlers while preserving Vim behavior"
  - "Extracting feature modules behind an existing effect boundary"
  - "Keeping adapter/runtime APIs out of semantic modal logic"
  - "Using golden effect tests to lock state/effect contracts before refactor"
related_components:
  - modal-engine
  - editor-adapter
  - testing-framework
  - documentation
tags:
  - pi-vimmode
  - modal-engine
  - modal-effect
  - feature-modules
  - golden-tests
  - inspectability
  - ex-command-line
  - typescript
---

# Pi vimmode modal feature module extraction pattern

## Context

`src/modal/engine.ts` had become the modal behavior hotspot. It coordinated prompt search, Ex command-line flow, visual operations, macros, registers, marks, message history, render/workbench state, normal dispatch, and adapter effects in long handlers. That made changes hard to review: search work required reading visual and macro branches, Ex changes touched render and register paths, and future work risked creating import cycles or hidden adapter coupling.

The architecture runway sprint solved this by extracting feature-family modules while preserving the existing `ModalEffect` boundary. The change stayed behavior-preserving: no new settings, dependencies, public keybindings, or broad Vim parity claims.

Session history search found no directly relevant prior sessions for this exact modal-engine extraction; related context came from current OpenSpec artifacts and existing solution docs.

## Guidance

Use the pattern: **extract feature modules behind the existing effect boundary, keep the engine as the router/coordinator**.

Final module shape:

- `src/modal/core.ts` owns shared helpers and effect constructors such as `withEffects`, `invalidate`, `delegate`, `modeUpdate`, `clearPending`, and `editState`.
- `src/modal/search.ts` owns prompt search lifecycle: starting `/` or `?`, pending search input, search history, repeat search, and search highlight state.
- `src/modal/ex-command-line.ts` owns Ex command-line entry, visual-source capture, command editing, preview/application, diagnostics, and source-mode restoration.
- `src/modal/visual.ts` owns visual character/line/block operations plus visual-block insert state.
- `src/modal/macros.ts` owns macro recording, replay guards, recorded input filtering, and play effects.
- `src/modal/normal.ts` owns normal-mode dispatch helpers, operator motion/text-object application, line commands, repeatable edit state, and movement updates.
- `src/modal/engine.ts` stays as top-level input routing and cross-feature coordination.

The architectural boundary remains `ModalUpdate` / `ModalEffect`. Feature modules accept modal state, editor snapshots, options, parsed commands, and diagnostics as inputs. They return modal updates. They do not import Pi adapter APIs, call lifecycle code, mutate terminal state, read settings files, or render TUI output directly.

Keep shared helpers in a small core module rather than letting feature modules import each other casually. That avoids cycles while giving search, Ex, visual, macro, and normal modules common state/effect constructors.

## Why This Matters

Modal editors accumulate behavioral coupling quickly. A single key can affect prompt text, cursor placement, registers, visual state, search highlights, dot-repeat, macro recording, transient messages, and Pi shortcut delegation. If all of that lives in one long handler, each new feature increases review cost and regression risk.

The extracted shape keeps concerns reviewable:

- feature-specific behavior lives near its tests and names;
- adapter side effects remain explicit through `ModalEffect`;
- Pi/TUI runtime calls stay at the adapter/router boundary;
- inspect/messages diagnostics stay bounded and prompt-local;
- future Ex/search/visual work can extend focused modules instead of adding branches to one monolith.

Golden modal effect tests make the refactor safe. They lock existing semantic state/effect behavior before code moves, then continue proving the extracted modules preserve behavior.

## When to Apply

- A modal engine or handler owns several unrelated feature families.
- Feature changes require reading branches for search, Ex, visual mode, macros, registers, marks, and render state together.
- An effect/update boundary already exists and can be preserved.
- Runtime adapter APIs must stay out of pure modal logic.
- Refactor must preserve behavior while adding inspectability or diagnostics.
- Golden tests can assert state/effect contracts independently of full adapter rendering.

## Examples

Before extraction, `src/modal/engine.ts` held many responsibilities:

```txt
src/modal/engine.ts
  applyCommand()
  executeExCommand()
  handleNormalInput()
  handleVisualInput()
  prompt search lifecycle
  Ex preview/apply flow
  visual block insert handling
  macro record/play handling
  transient messages
  protected Pi delegation
```

After extraction, feature families have narrow homes:

```txt
src/modal/engine.ts            router/coordinator
src/modal/core.ts              shared helpers/effects
src/modal/search.ts            / ? n N, history, highlights
src/modal/ex-command-line.ts   : commands, previews, diagnostics
src/modal/visual.ts            visual char/line/block edits
src/modal/macros.ts            q/@ record/play guards
src/modal/normal.ts            normal commands/repeatable edits
```

Preserve the top-level macro-recording contract in the coordinator:

```ts
export function handleModalInput(...): ModalUpdate {
  const update = routeModalInput(...);

  if (!state.recordingSlot || !shouldRecordInput(...)) return update;

  return {
    ...update,
    state: appendRecordedInput(update.state, state.recordingSlot, input),
  };
}
```

Use golden tests around behavior that is easy to break during extraction. `test/modal-effects.test.ts` feeds modal key sequences into the engine, applies edit/restore effects to a local text/cursor model, and asserts normalized state/effect output for:

- prompt search completion, highlights, and repeat;
- Ex substitution preview/apply;
- visual delete and normal-mode restoration;
- macro record/replay through adapter play effects;
- protected Pi shortcut delegation while clearing pending operators.

Validation evidence from the completed sprint:

- `bun run format:check`
- `bun run lint`
- `bun run check-types`
- `bun test` — 355 tests passing
- `openspec validate architecture-runway-sprint-with-inspectability --type change --strict`
- `openspec validate --specs --strict`
- `openspec status --change "architecture-runway-sprint-with-inspectability"` — apply-ready

## Related

- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — predecessor modal/buffer/adapter split. Some responsibility wording may need refresh now that `engine.ts` is a coordinator rather than owner of all modal semantics.
- `docs/solutions/architecture-patterns/pi-vimmode-finite-ex-line-commands-architecture-2026-06-01.md` — related finite Ex architecture. Its guidance around keeping Ex side effects in `src/modal/engine.ts` should now point to `src/modal/ex-command-line.ts` plus the engine/router boundary.
- `docs/solutions/architecture-patterns/pi-vimmode-ex-command-line-substitution-architecture-2026-05-28.md` — earlier Ex command-line pattern. New extraction gives Ex lifecycle a focused module.
- `docs/solutions/architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md` — boundary rule for keeping text surgery in buffer helpers and modal code at the Vim-intent level.
- `docs/solutions/design-patterns/pi-vimmode-search-highlighting-render-precedence-2026-05-28.md` — search/render precedence still applies; search lifecycle now lives in `src/modal/search.ts`.
