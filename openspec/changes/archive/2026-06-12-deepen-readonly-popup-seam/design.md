## Context

pi-vimmode now treats read-only popup output as a generic runtime surface, not only keybinding discovery. Successful commands such as `:help`, `:features`, `:keybindings`, `:actions`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`, and `:vimmode inspect` share the same bounded popup model, scroll behavior, overlay rendering, and prompt-state preservation expectations.

The current ownership does not match that shape. `src/keybinding-discovery-popup.ts` defines `ReadOnlyPopup`, `ReadOnlyPopupSource`, `HELP_POPUP_BODY_ROWS`, `scrollHelpPopup`, and message-to-lines helpers while also importing inspectability content from `src/modal/inspect.ts`. `src/modal/types.ts` imports `ReadOnlyPopup` back from `src/keybinding-discovery-popup.ts`, producing a feature-content-to-modal-to-feature-content cycle. The implementation works, but the interface is shallow: callers must import a keybinding-discovery module to use a generic read-only popup contract.

Constraints:

- Keep product scope to practical Pi prompt editing, not full Vim/Neovim parity.
- Preserve all current popup-backed command behavior and side effects.
- Keep modal code TUI-free; `VimEditor` remains the Pi/TUI adapter.
- Avoid new settings, docs behavior, runtime dependencies, or broad performance work.
- Treat OpenSpec specs and existing ADRs as durable source of truth.

## Goals / Non-Goals

**Goals:**

- Create one shared read-only popup seam that owns generic popup state, source identifiers, body row sizing, message splitting, popup construction, and scroll clamping.
- Keep keybinding discovery as one popup content producer, not owner of the generic popup interface.
- Rewire modal types/effects, modal popup input handling, and overlay rendering to depend on the shared popup seam.
- Remove the popup-related import cycle and prevent new feature-content cycles around popup state.
- Add focused regression tests that make the cleanup measurable without changing user-facing behavior.

**Non-Goals:**

- No new commands, keybindings, settings, docs claims, or popup controls.
- No behavior changes for `:help`, `:features`, `:keybindings`, `:actions`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`, or `:vimmode inspect`.
- No change to prompt text edits, cursor placement, registers, marks, macros, dot-repeat, search highlights, visual state, Ex messages, message history, or Pi delegation semantics.
- No broad config cleanup, prompt-buffer optimization, modal dispatch rewrite, or runtime performance tuning.

## Decisions

### Decision 1: Extract a shared read-only popup core module

**Target seams:** `src/read-only-popup.ts` (new), `src/keybinding-discovery-popup.ts`, `src/modal/types.ts`, `src/keybinding-discovery-overlay.ts`, `src/modal/engine.ts`.

Add a small shared module such as `src/read-only-popup.ts` that exports:

- `HELP_POPUP_BODY_ROWS`
- `ReadOnlyPopupSource`
- `ReadOnlyPopup`
- `HelpPopup` compatibility alias if useful during migration
- `popupFromMessage` or a narrowly named equivalent
- `splitPopupMessage` if tests need direct coverage
- `scrollHelpPopup` or a renamed `scrollReadOnlyPopup`

`src/keybinding-discovery-popup.ts` should keep command/content builders and import the shared contract. Modal and overlay code should import from the shared module rather than from keybinding-discovery content.

**Alternatives considered:**

- Leave generic types in `src/keybinding-discovery-popup.ts`: rejected because it preserves the current cycle and makes keybinding discovery appear to own every read-only diagnostic surface.
- Move everything into `src/modal/types.ts`: rejected because popup message splitting and scroll clamping are UI/popup helpers, not modal state primitives.
- Create a nested `src/popup/read-only.ts` directory: acceptable if implementation prefers grouping, but likely unnecessary for one small core module.

### Decision 2: Keep content builders separate from popup mechanics

**Target seams:** `src/keybinding-discovery-popup.ts`, `src/runtime-help.ts`, `src/customization.ts`, `src/modal/inspect.ts`.

The shared popup module should not import runtime help, customization diagnostics, or modal inspect content. It should only know how to represent and manipulate popup data. Content builders remain in the existing source-backed modules and feed the shared model.

This preserves current source-of-truth boundaries:

- `src/runtime-help.ts` for runtime help and features.
- `src/customization.ts` and `src/prompt-transform-actions.ts` for customization diagnostics.
- `src/modal/inspect.ts` for bounded inspect and message summaries.
- `src/keybinding-discovery-popup.ts` for assembling popup content from those sources.

**Alternatives considered:**

- Move all popup builders into the new core module: rejected because it would recreate a different god module and pull modal/customization/runtime-help dependencies into the shared seam.
- Split every command into its own popup module now: rejected as over-abstracted for a behavior-preserving cleanup.

### Decision 3: Preserve the existing modal effect and overlay behavior

**Target seams:** `src/modal/types.ts`, `src/modal/engine.ts`, `src/keybinding-discovery-overlay.ts`, `src/vim-editor.ts`.

Keep `ModalEffect` semantics unchanged: modal code returns `openReadOnlyPopup`, and `VimEditor` applies it through the existing overlay integration. Only import ownership changes. Popup-local close/scroll behavior and modal-owned popup state scrolling should continue to use the same clamp helper.

Side effects remain explicit and unchanged: popup display and scroll MUST NOT edit prompt text, move cursor, write registers/marks, change macros, update dot-repeat, clear search highlights, mutate visual state beyond existing source-mode restoration, append popup content to message history, or invoke Pi delegation.

**Alternatives considered:**

- Rewrite popup scroll handling to live only in the overlay component: rejected because `ModalState.helpPopup` still needs deterministic scroll updates while a popup is represented in modal state.
- Rename all `helpPopup` state fields in the same change: rejected unless required by type clarity; it increases churn without removing the cycle.

### Decision 4: Add a focused import-cycle guard if no project check exists

**Target seams:** `test/` or existing docs/runtime drift tests.

The cleanup is measurable if tests can fail on the current cycle or on a future reintroduction. Prefer a focused test that checks the known forbidden popup cycle or verifies import direction for the shared popup module. Keep it lightweight and deterministic; do not add new dependencies unless existing tooling already exposes cycle checks.

**Alternatives considered:**

- Rely only on graphify output: rejected because graph output is advisory and may be stale.
- Add a full dependency-cruiser-style tool: rejected because this small cleanup does not justify a new runtime or dev dependency unless the repo already has one.

## Risks / Trade-offs

- **Type churn causes accidental behavior changes** → Keep exported names compatible where practical, move one seam at a time, and run existing modal/overlay/live editor tests.
- **New shared module becomes a god module** → Limit it to data types and pure helpers; leave content builders in existing source-backed modules.
- **Import cycle guard becomes brittle** → Test a stable forbidden relationship or exact known cycle, not whole-repo graph structure.
- **Docs drift from internal rename** → Avoid user-facing docs updates unless behavior or command lists change; rely on existing docs-drift tests to catch accidental behavior claims.
- **Config propagation risk** → No settings are planned. If implementation adds any setting, update `src/config.ts`, `src/types.ts`, `VimEditor` `cloneOptions`, settings docs, config tests, and live editor option propagation tests in the same change.
- **Graph staleness masks new cycles** → Verify current imports with source and tests, then run `graphify update .` after code changes.

## Migration Plan

1. Add shared read-only popup module with copied generic types/constants/helpers and focused unit coverage.
2. Update `src/keybinding-discovery-popup.ts` to import the shared contract/helpers and keep content builders behavior-compatible.
3. Update `src/modal/types.ts`, `src/keybinding-discovery-overlay.ts`, and `src/modal/engine.ts` imports to use the shared popup seam.
4. Remove obsolete exports from keybinding-discovery content only after all imports are rewired.
5. Add or update import-cycle guard coverage.
6. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.
7. Run `graphify update .` after code changes so graph artifacts no longer report the removed cycle.

Rollback strategy: revert import rewiring and shared module extraction as one small commit if behavior tests fail unexpectedly; no data migration or user setting migration is involved.

## Open Questions

- Should the shared helper keep the existing `scrollHelpPopup` name for minimal churn, or rename to `scrollReadOnlyPopup` with a compatibility export?
- Should `popupFromMessage` and `splitPopupMessage` be public exports for direct tests, or should tests cover them through content builders?
- Does an existing test helper already support import-cycle detection, or should this change add a narrow no-dependency guard?
