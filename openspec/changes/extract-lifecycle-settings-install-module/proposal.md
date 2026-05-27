## Why

Startup and reload behavior now sits in `src/index.ts` as a small but subtle cluster: stable editor factory identity, settings refresh, delayed reinstall, multiple Pi lifecycle hooks, and terminal cursor cleanup. Reload bugs become costly to diagnose because lifecycle behavior, settings load, and editor tracking are coupled in one entrypoint.

## What Changes

- Extract a lifecycle/settings install module that owns Vim editor registration across Pi lifecycle events.
- Preserve the stable editor factory identity so reload hooks do not churn editor components unnecessarily.
- Preserve immediate and delayed install behavior for session/resource reload paths.
- Preserve settings refresh and warning status updates while keeping `src/config.ts` a pure settings parser/loader.
- Preserve terminal cursor reset for known editor instances on session shutdown.
- Add focused tests for lifecycle hook registration, reinstall timing, stale-context tolerance, option refresh, and shutdown cleanup.
- No breaking changes to user settings, keybindings, editor APIs, or package entrypoint.

## Capabilities

### New Capabilities

- `vim-extension-lifecycle`: Covers Pi lifecycle hook handling, Vim editor component installation, settings refresh integration, delayed reinstall, stale-context tolerance, and terminal cursor cleanup.

### Modified Capabilities

- None

## Impact

- Affected code: `src/index.ts`, new lifecycle/settings install module under `src/`, and possibly small exported test seams.
- Affected tests: new lifecycle-focused tests plus existing config/editor tests.
- Affected specs: new `openspec/changes/extract-lifecycle-settings-install-module/specs/vim-extension-lifecycle/spec.md`.
- No dependency, settings schema, README, or public package API changes expected.
