## Context

pi-vimmode already has strong focused tests around parser, prompt buffer operations, modal state, config, and adapter behavior. Recent inspection found three contract gaps that those tests did not fully protect: README limitations drifted after roadmap keybindings shipped, `VimEditor.cloneOptions()` appears to drop `marks`, and `dd` does not set a repeatable change even though dot-repeat is documented for supported completed changes.

The change hardens behavior contracts before larger features such as prompt search or command mode. It uses existing OpenSpec specs and tests as source of truth, then brings README and actual adapter behavior back into alignment.

## Goals / Non-Goals

**Goals:**

- Make README limitations match current supported behavior.
- Fix existing-contract gaps in actual `VimEditor` behavior, especially mark configuration propagation.
- Validate dot-repeat for documented line edit commands through focused tests.
- Add a test-only scenario harness that drives real `VimEditor` behavior while keeping modal-engine tests local and precise.

**Non-Goals:**

- Add prompt search (`/`, `?`, `n`, `N`).
- Define or implement command mode / Ex-style commands.
- Introduce a new production editor-driver interface or second adapter.
- Refactor `engine.ts` or `buffer.ts` broadly without a failing contract motivating it.

## Decisions

### Use a test-only real-editor harness

A production seam around editor driving would be premature because pi-vimmode currently has one adapter: `VimEditor`. The scenario harness should live under tests and exercise the existing adapter directly, so it catches option cloning, effect application, and mode-state integration bugs without adding runtime interface surface.

Alternative considered: create a production editor-driver interface now. Rejected because one adapter makes the seam hypothetical; it would increase interface cost before there is a second adapter or runtime variation.

### Keep engine tests as the locality layer

The real-editor harness should not replace modal-engine tests. Engine tests stay responsible for precise state/effect contracts, while real-editor scenarios assert that the same contracts survive construction through `VimEditor` and public editor behavior.

Alternative considered: move most behavioral tests to `VimEditor`. Rejected because failures would lose locality and make parser/buffer/modal bugs harder to isolate.

### Treat only existing-contract gaps as allowed feature fixes

This change may fix behavior already implied by docs, specs, or config contracts. It must not add a new interaction surface merely because it is small. Dot-repeat for documented line edits qualifies; prompt search does not.

Alternative considered: include small standalone Vim actions if low risk. Rejected to prevent hardening from becoming a feature grab bag.

### Prefer targeted fixes over broad decomposition

`engine.ts`, `buffer.ts`, and `config.ts` are large, but size alone is not enough reason to split them. This change should deepen tests and fix proven contract gaps first; any module split should follow from repeated friction found while implementing the harness.

Alternative considered: refactor engine/buffer seams first. Rejected because current evidence points to contract coverage gaps, not a specific production module seam that would improve leverage immediately.

## Risks / Trade-offs

- Scenario harness becomes a duplicate mini-framework → Keep helpers narrow: create editor, feed input, assert text/cursor/mode; avoid mirroring modal internals.
- Dot-repeat changes affect registers or counts unexpectedly → Add targeted tests for changed prompt text, cursor, mode, and unnamed register behavior around repeated line edits.
- README drift recurs → Anchor README updates to OpenSpec behavior terms and avoid broad unsupported-feature lists that mention already-supported groups.
- Real-editor tests become brittle around Pi internals → Drive only public `VimEditor`/`CustomEditor` behavior already used by existing adapter tests.
