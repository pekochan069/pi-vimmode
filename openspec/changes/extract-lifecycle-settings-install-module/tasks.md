## 1. Lifecycle Module

- [ ] 1.1 Create `src/lifecycle.ts` with production defaults for `VimEditor`, `loadVimOptions`, `DEFAULT_VIM_OPTIONS`, and `setTimeout`.
- [ ] 1.2 Move current option state, tracked editor set, stable editor factory, install helper, delayed install helper, and shutdown cleanup from `src/index.ts` into the lifecycle module.
- [ ] 1.3 Register `session_start`, `resources_discover`, `agent_end`, and `session_shutdown` hooks in the lifecycle module with current install/schedule semantics preserved.
- [ ] 1.4 Preserve delayed reinstall error handling so scheduled stale-context failures are caught while immediate install failures still surface.

## 2. Entry Point and Config Boundary

- [ ] 2.1 Replace `src/index.ts` lifecycle implementation with a thin default export that delegates to the lifecycle registration function.
- [ ] 2.2 Keep `src/config.ts` free of Pi hook registration, editor component installation, scheduling, and editor instance tracking.
- [ ] 2.3 Ensure no settings schema, keymap, cursor, startup mode, or package entrypoint behavior changes.

## 3. Lifecycle Tests

- [ ] 3.1 Add fake Pi API/context helpers that record hook registration, editor component reads/writes, status updates, scheduler callbacks, and settings-loader calls.
- [ ] 3.2 Test `session_start` and `resources_discover` perform immediate install and enqueue exactly one delayed reinstall.
- [ ] 3.3 Test `agent_end` performs immediate install without enqueueing delayed reinstall.
- [ ] 3.4 Test stable factory identity and no component churn when the Vim factory is already installed.
- [ ] 3.5 Test settings refresh uses context `cwd`, updates `pi-vimmode` status to `vim` or `vim ⚠`, and passes latest options to newly created editors.
- [ ] 3.6 Test delayed reinstall catches stale-context errors but successful delayed reinstall refreshes options again.
- [ ] 3.7 Test `session_shutdown` resets all tracked editor cursor styles, clears tracked editors, and is safe with no editors.

## 4. Validation and Cleanup

- [ ] 4.1 Run `bun test` and fix failures.
- [ ] 4.2 Run `bun run check-types` and fix TypeScript errors.
- [ ] 4.3 Mark the lifecycle/settings install item complete in `TODOS.md` after implementation passes validation.
