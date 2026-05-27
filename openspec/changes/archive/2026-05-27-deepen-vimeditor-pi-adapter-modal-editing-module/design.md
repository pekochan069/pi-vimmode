## Context

`pi-vimmode` replaces Pi's prompt editor with `VimEditor`, a `CustomEditor` subclass. The current implementation works, but `VimEditor` now owns multiple responsibilities: Pi input delegation, modal state, normal/visual key dispatch, register updates, status rendering, visual render setup, terminal cursor hints, and cursor restoration through Pi movement keys.

The project already has useful seams: `src/commands.ts` parses finite normal-mode grammar and `src/buffer.ts` contains pure text/register helpers. This change deepens that pattern by making `VimEditor` the Pi adapter and moving modal semantics into a module with typed effects.

## Goals / Non-Goals

**Goals:**

- Keep `VimEditor` as the Pi-facing `CustomEditor` implementation while slimming it to adapter duties.
- Extract modal editing state, key dispatch, command execution, and state transitions into testable module code.
- Make Pi integration explicit through snapshots and effect intents instead of direct Pi calls from modal semantics.
- Preserve all current user-facing behavior, settings, supported keymap, visual rendering, terminal cursor hints, and Pi shortcut compatibility.
- Add tests that can verify modal behavior without constructing Pi TUI/editor instances.

**Non-Goals:**

- No new Vim commands, counts, text objects, search, ex commands, macros, marks, named registers, or system clipboard behavior.
- No changes to Pi core or reliance on private Pi editor state.
- No replacement of the existing finite parser or pure buffer helpers.
- No full terminal cursor negotiation or Neovim cursor option parity.

## Decisions

### Decision: Use `VimEditor` as the Pi adapter shell

`VimEditor` SHALL remain the class constructed by `src/index.ts` and still extend `CustomEditor`. It will collect editor snapshots, call the modal module, apply returned effects, bridge rendering/status, and preserve lifecycle-sensitive behavior such as cursor reset.

Alternatives considered:

- Replace `VimEditor` with a new class name: rejected because it creates import/test churn without product value.
- Move Pi lifecycle logic from `src/index.ts` into the modal module: rejected because lifecycle belongs to extension integration, not Vim semantics.

### Decision: Modal module returns typed effects/intents

The modal module should accept current modal state, editor snapshot, input data, and options. It should return next modal state plus a small effect list that the adapter applies. Initial effect categories should cover current needs only:

- delegate input to Pi
- set prompt text with target cursor and optional register update
- request public cursor movement to a target position
- request mode/status invalidation
- request terminal cursor style/reset

Alternatives considered:

- Let modal code receive callbacks into `VimEditor`: rejected because it keeps Pi coupling hidden.
- Build a general editor framework: rejected as over-abstracted for current scope.

### Decision: Keep cursor restoration adapter-owned

Programmatic edits can compute a target cursor in pure code, but reaching that cursor uses Pi public movement keys today. The modal module should return desired positions; the adapter should keep `setText()` plus public movement/restoration logic.

Alternatives considered:

- Directly mutate Pi cursor internals: rejected because private API access is fragile.
- Encode movement key sequences inside modal module: rejected because it leaks Pi implementation details into modal semantics.

### Decision: Keep parser and buffer helpers as modal dependencies

`src/commands.ts` should remain the finite normal-mode grammar. `src/buffer.ts` should remain the pure text/range/register layer. The modal module orchestrates those helpers and translates their results into effects.

Alternatives considered:

- Merge parser into modal engine: rejected because parser tests already provide cheap coverage for pending-key edge cases.
- Move buffer helpers into adapter: rejected because text transforms should stay independent of Pi rendering and input delegation.

### Decision: Separate view/status derivation from Pi rendering

Mode labels, pending labels, and visual summaries should become testable derivation helpers. The adapter should still call `super.render(width)` for non-visual rendering, use the existing visual render helper for active visual selections, and apply border/status formatting in the Pi-facing layer.

Alternatives considered:

- Make the modal module produce full rendered strings: rejected because rendering depends on Pi/TUI styling and width integration.
- Keep all status logic in `VimEditor`: rejected because it preserves the current responsibility pile-up.

## Risks / Trade-offs

- Effect model too broad → Keep union limited to current behavior; add variants only when a refactor slice needs them.
- Behavior drift during extraction → Refactor in parity slices and run tests after each slice.
- Pi shortcut regression → Preserve existing delegate/reset behavior and add modal tests for `Esc`, `Enter`, `Ctrl+C`, `Ctrl+D`, `Ctrl+G`, and unknown non-printable inputs.
- Cursor restoration regression → Keep restoration in adapter and add tests around target cursor returned by modal effects plus existing integration tests.
- Visual rendering drift → Keep normal render path delegated to `super.render(width)` and keep visual rendering scoped to active visual modes.
- More files to navigate → Use names that state layers clearly: adapter, modal engine/state/effects, parser, buffer, render.

## Migration Plan

1. Add modal state/effect/snapshot types without changing behavior.
2. Extract one mode path at a time from `VimEditor` into the modal module.
3. Keep `VimEditor` applying effects immediately after each extraction slice.
4. Move status/view derivation helpers after key handling is stable.
5. Update docs once code shape is real.
6. Validate with `bun test`, `bun run check-types`, `bun run lint`, and `bun run format:check`.

Rollback is straightforward: revert the refactor commit(s). No persisted data, config migration, or external service changes are involved.

## Open Questions

- Should modal module files live as top-level `src/modal-*.ts` files or under `src/modal/`? Prefer `src/modal/` if extraction creates more than two files.
- Should effect application be one adapter function or private methods on `VimEditor`? Prefer a small adapter function if it improves tests without exposing Pi internals.
