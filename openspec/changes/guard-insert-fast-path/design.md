## Context

`VimEditor.handleInput` currently builds an `EditorSnapshot` for every keystroke before calling `handleModalInput`. That is correct but wasteful for the common insert-mode case where the user types ordinary text and the modal engine only returns a delegate effect back to Pi's default editor.

The modal engine also owns subtle state transitions and side effects: `Esc` mode changes, autocomplete delegation, help/pending Ex/search routing, transient Ex message clearing, macro recording, block insert, and search highlight state. Any fast path must be narrow enough that bypassing `handleModalInput` cannot skip those semantics.

## Goals / Non-Goals

**Goals:**

- Avoid constructing the full modal snapshot for safe ordinary insert-mode text input.
- Preserve current user-facing insert-mode behavior exactly.
- Keep modal semantics testable in modal helpers and Pi runtime effects inside `VimEditor`.
- Cover hidden side effects with focused regression tests before relying on the optimization.
- Provide a reproducible local measurement artifact for the insert path without adding timing gates to CI.

**Non-Goals:**

- Do not change npm package publishing, package verification, or dist artifact scope.
- Do not change supported Vim commands, settings, docs, or public behavior.
- Do not add new runtime dependencies.
- Do not refactor unrelated package-size ideas such as config clone helpers, keymap descriptor tables, docs metadata stripping, buffer helper dedupe, or compiled keymap caches.
- Do not add brittle performance thresholds to automated validation.

## Decisions

### Decision 1: Use a positive allowlist for fast delegation

Target seams: `src/modal/engine.ts` or a nearby modal helper, plus `src/modal/types.ts` if a context type is needed.

The fast-path predicate should return true only when the state and input are known safe: insert mode, plain text input, no pending modal workflows, no help popup, no block insert, no macro recording, no transient Ex message, no search state that needs modal/render handling, and no adapter-owned replay/autocomplete condition that requires the modal path.

Alternative considered: blacklist known unsafe states and delegate everything else. Rejected because modal state grows over time, and missing one new field could silently bypass the state machine.

Alternative considered: keep the guard entirely inside `VimEditor`. Rejected because modal-owned state semantics are easier to test and review near the modal engine; the adapter should only add adapter-owned facts.

### Decision 2: Pass a narrow fast-path context object

Target seams: modal fast-path helper and `VimEditor.handleInput`.

The modal helper may accept a small context object for facts not represented directly in `ModalState`, such as macro replay status or autocomplete/open-completion state if needed. This keeps the predicate pure while avoiding pressure to copy adapter runtime state into `ModalState`.

Alternative considered: helper signature of only `(state, data)`. Rejected because replay and autocomplete are currently snapshot/adapter facts and are relevant to safe delegation.

### Decision 3: Direct delegation must preserve adapter text-change effects

Target seam: `src/vim-editor.ts`.

When the fast path calls `super.handleInput(data)` directly, it must keep the same redo-stack behavior currently applied for delegate effects: take a redo snapshot before delegation and clear redo after a real text change. It should not call modal effect application for fast-path input because the point is to avoid snapshot/modal work.

Alternative considered: manufacture a delegate `ModalEffect` and pass it through `applyEffects`. Rejected because it still requires a modal update shape and obscures that this is an adapter-level fast path.

### Decision 4: Unsafe states always fall back to `handleModalInput`

Target seams: modal helper tests and live `VimEditor` tests.

Inputs such as `Esc`, control/meta/navigation keys, pending Ex/search input, help popup input, block insert, macro recording/playback, transient Ex messages, and states with search/highlight behavior that the modal/render path must preserve should use the existing modal engine. Fallback preserves correctness and makes the fast path optional.

Alternative considered: duplicate selected modal side effects in the fast path. Rejected because duplicating modal behavior in `VimEditor` would make the adapter less thin and increase drift risk.

### Decision 5: Measurement is local evidence, not a CI gate

Target seams: a script or documented command plus tests that prove the structural fast-path behavior.

Add a reproducible measurement that can compare full insert handling, snapshot construction, modal delegate routing, and default editor insertion on a fixed long prompt/iteration count. Do not fail CI based on elapsed time.

Alternative considered: assert timing thresholds in tests. Rejected because terminal/editor performance varies enough that thresholds would be flaky.

## Risks / Trade-offs

- Fast path accidentally accepts an unsafe input → Mitigation: positive allowlist, explicit input classifier, unsafe-state unit tests, and live editor regressions.
- Macro recording or replay diverges from modal semantics → Mitigation: disable fast path while recording/replaying and test both record and replay paths.
- Transient Ex message or search render state remains stale → Mitigation: route those states through `handleModalInput` and pin expected behavior with tests.
- Redo stack is not cleared after direct delegated text insertion → Mitigation: reuse the adapter's redo snapshot/clear pattern and add a regression test.
- Measurement shows snapshot is not the real hotspot → Mitigation: keep implementation small; use the measurement to decide whether to keep, revise, or drop the fast path during implementation.

## Migration Plan

1. Add the modal fast-path predicate and unit tests without wiring it into `VimEditor`.
2. Wire `VimEditor.handleInput` to use the predicate before constructing a snapshot.
3. Add live editor regression tests for normal insert typing and unsafe fallback side effects.
4. Add the local measurement artifact/command.
5. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback is simple: remove the fast-path branch in `VimEditor.handleInput` and keep the existing full modal path.

## Open Questions

- Exact plain-text classifier should be confirmed against Pi/Bun input shapes during implementation: single printable characters are safe; multi-character paste, Enter, Tab, Backspace, escape sequences, and control/meta input should start on the modal path unless proven safe.
- The measurement may show another hotspot dominates. If so, implementation should pause or keep only the low-risk structural cleanup rather than expanding scope.
