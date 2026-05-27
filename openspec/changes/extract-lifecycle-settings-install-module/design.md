## Context

`src/index.ts` currently performs all Pi extension lifecycle work inline: it owns `currentOptions`, creates a stable `editorFactory`, tracks created `VimEditor` instances, refreshes settings, installs the editor component, schedules a delayed reinstall after reload-sensitive hooks, and resets terminal cursor style on shutdown.

That code is readable because it is small, but each line encodes reload behavior. If reload bugs recur, preserving the exact lifecycle contract needs focused tests and a deeper module boundary. `src/config.ts` already behaves like a pure settings module and should not absorb Pi hook or editor-install concerns.

## Goals / Non-Goals

**Goals:**

- Move Pi lifecycle/editor installation behavior out of `src/index.ts` into one cohesive module.
- Preserve current user-visible behavior for settings, startup mode, cursor style, editor registration, and terminal cursor cleanup.
- Make reload behavior testable without depending on real Pi runtime objects.
- Keep `src/config.ts` focused on parsing/loading options from settings files.
- Keep package entrypoint and extension export unchanged.

**Non-Goals:**

- Change settings schema or validation semantics.
- Change Vim editor behavior, keymaps, rendering, or modal command semantics.
- Add new runtime dependencies.
- Introduce a general plugin framework or lifecycle abstraction for unrelated extensions.
- Fix unrelated reload bugs outside the lifecycle/install path.

## Decisions

### Extract one lifecycle install module

Create a module such as `src/lifecycle.ts` that owns the extension lifecycle state: current options, known editors, stable editor factory, install/refresh helpers, delayed reinstall scheduling, hook registration, and shutdown cleanup.

Rationale: lifecycle state is cohesive and should have one home. Keeping it together avoids scattering reload-sensitive invariants across `index.ts`, `config.ts`, and `vim-editor.ts`.

Alternative considered: split settings refresh, editor factory, and hook registration into separate files. Rejected because the current problem is one small lifecycle seam; splitting it further would over-abstract and make ordering harder to audit.

### Keep `index.ts` as a thin adapter

`src/index.ts` should keep the default extension export and delegate to the lifecycle module, for example `registerVimLifecycle(pi)`. It should not hold mutable lifecycle state.

Rationale: package loading stays stable for Pi while tests can import the lifecycle module directly.

Alternative considered: leave `index.ts` unchanged and only add tests around it. Rejected because tests would need to reach through the package entrypoint and would not create a named module boundary for future reload fixes.

### Inject narrow dependencies for tests

Expose a small factory or registration function with optional dependencies for tests: editor constructor/factory, settings loader, default options, and scheduler. Production uses `VimEditor`, `loadVimOptions`, `DEFAULT_VIM_OPTIONS`, and `setTimeout`.

Rationale: fake Pi contexts and fake schedulers make reload behavior deterministic. Dependency injection avoids sleeping in tests and avoids constructing real TUI/editor internals.

Alternative considered: use global monkeypatching for `setTimeout` and module imports. Rejected because it creates brittle tests and makes Bun test ordering matter.

### Preserve stable factory identity

The lifecycle module should create exactly one editor factory per extension registration. Reinstall checks must continue comparing `ctx.ui.getEditorComponent()` against that stable factory before calling `setEditorComponent`.

Rationale: Pi reload behavior depends on avoiding unnecessary component churn while still restoring the Vim editor when another component is active.

Alternative considered: create a fresh factory on each install. Rejected because it would make the identity check always fail and could re-register unnecessarily during reload hooks.

### Refresh options on every install attempt

Every immediate or delayed install should call the settings loader with the active context `cwd`, update current options, and set the `pi-vimmode` status to `vim` or `vim ⚠` based on warnings. New editors created after that install should receive the latest options snapshot.

Rationale: settings changes should be picked up when Pi emits reload/session hooks. Config parsing stays pure; lifecycle decides when to load.

Alternative considered: cache options until file timestamps change. Rejected because current behavior reloads on lifecycle events and does not require filesystem watchers.

### Catch delayed stale-context failures only

Delayed reinstall should preserve the current defensive `try/catch` around the scheduled install because contexts can go stale during reload/session switch. Immediate installs should still surface failures.

Rationale: hiding synchronous failures would make real startup bugs harder to see, but delayed callback failures are known reload races that the next `session_start` can repair.

Alternative considered: catch all install failures. Rejected because it would mask broken settings/status/editor registration during normal startup.

## Risks / Trade-offs

- Behavior drift during extraction → Mitigation: add tests that pin hook names, install ordering, factory identity, settings refresh, delayed catch behavior, and shutdown cleanup.
- Test-only dependency injection leaks into public surface → Mitigation: keep helpers internal to source package; do not document or export from package root.
- Extra module feels heavier than current small file → Mitigation: keep one cohesive file and preserve readable names; do not split lifecycle into micro-classes.
- Fake tests may miss Pi runtime edge cases → Mitigation: model only current contract and keep existing package entrypoint integration path intact.

## Migration Plan

1. Add lifecycle module with production defaults and focused test seams.
2. Move mutable lifecycle state and hook registration logic from `src/index.ts` into that module.
3. Replace `src/index.ts` body with a thin call to the lifecycle registration function.
4. Add lifecycle tests using fake Pi API, fake contexts, fake scheduler, and fake editor objects.
5. Run `bun test` and `bun run check-types`.

Rollback: move lifecycle code back into `src/index.ts` and delete lifecycle tests/module. No settings or user data migration required.
