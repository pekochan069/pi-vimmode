## Context

The extension already keeps Vim behavior in `src/modal/engine.ts` and pure text/range operations in `src/buffer.ts`. `VimEditor` applies modal effects such as cursor restoration, edits, terminal cursor hints, and invalidation. Normal command parsing is finite and configurable for static key sequences, but mark commands need dynamic slot keys (`a-z`) after `m`, backtick, or single quote.

Marks should feel like Vim local marks for prompt editing without importing full Vim buffer semantics. The prompt editor has one mutable prompt buffer, no file identity, and no persistent editor storage, so marks should be in-memory editor state and safe after prompt text changes.

## Goals / Non-Goals

**Goals:**

- Support local lowercase marks set with `m{slot}`.
- Support exact jumps with backtick + `{slot}` and line-first-nonblank jumps with single-quote + `{slot}`.
- Let mark jumps work from normal mode and visual modes.
- Let delete/change/yank use mark jumps as operator motions where range semantics are deterministic.
- Keep all mark state TUI-free and testable through modal/buffer helpers.
- Keep invalid, missing, and stale marks safe no-ops or clamped jumps.
- Document behavior and update `TODOS.md` only after validation passes.

**Non-Goals:**

- Uppercase/global/file marks, numbered/special marks, automatic marks like previous-jump marks, or mark lists.
- Persistence across editor instances or Pi sessions.
- Full Vim mark adjustment after every edit; marks are normalized/clamped when used.
- Counts, text objects, ex commands, or full Vim motion grammar.
- Mark status UI beyond existing pending-prefix feedback.

## Decisions

### Store local marks in modal state

Add a mark store to `ModalState`, keyed by lowercase `a-z`, with values as `Position`. Add a transient pending mark action for `set`, `jumpExact`, and `jumpLine` so `m`, backtick, and single quote can wait for the next slot key.

Rationale: modal state already owns mode, visual anchor, pending operators, and registers. Marks are Vim-mode semantics, not Pi adapter concerns. Keeping marks in modal state lets parser and modal tests run without TUI objects.

Alternative considered: store marks in `VimEditor`. Rejected because visual/operator mark behavior would need adapter callbacks or duplicated post-processing.

### Parse mark prefixes outside the static keymap resolver

Handle `m`, backtick, and single quote in modal input before or alongside `resolveNormalCommand()`. Dynamic slot keys should not be added to `ResolvedVimKeymap`, because the keymap resolver is for configured static command/motion sequences.

Rationale: mark slots are data, not configurable commands. A small dedicated mark-prefix state avoids adding artificial commands for every possible mark slot and avoids conflicts with multi-key operator pending states.

Alternative considered: encode every `ma`, backtick+`a`, and quote+`a` sequence into the keymap. Rejected because it makes dynamic mark slots noisy and hard to combine with operator pending.

### Normalize marks through buffer helpers

Add pure helpers that validate mark slots, store normalized positions, resolve exact mark jumps, resolve line-first-nonblank jumps, and clamp stale positions to the current prompt. Reuse `normalizeBufferPosition()` and first-nonblank logic rather than duplicating line math in modal code.

Rationale: mark behavior depends on prompt text shape. Keeping line/column math in `buffer.ts` preserves the current architecture where modal code decides semantics and buffer helpers decide range/position details.

Alternative considered: adjust all marks eagerly after every edit. Rejected for initial implementation because current `EditResult` does not describe edit deltas, and exact Vim mark-update semantics would add broad complexity before users validate need.

### Treat mark jumps as movement effects

Normal-mode mark jumps emit `restoreCursor` plus `invalidate`. Visual-mode mark jumps emit the same cursor restoration while preserving `visualAnchor`, so the active selection extends to the mark target. Missing marks no-op with invalidation only.

Rationale: this mirrors existing buffer-start/end/matching-pair motions and keeps Pi cursor movement centralized in `VimEditor.restoreCursor()`.

Alternative considered: rewrite text/cursor directly through edit effects. Rejected because mark jumps do not edit text and should not touch undo history.

### Support mark operator motions with explicit line/char rules

When an operator is pending and the user enters a mark jump, consume the operator and mark slot together. Backtick mark motions operate on the characterwise range between the cursor and exact mark target. Single-quote mark motions operate on whole lines between the cursor line and marked line. Yank writes registers without editing; delete/change reuse buffer range helpers and change enters insert mode.

Rationale: mark jumps are useful as motions, and this matches the extension's existing operator-motion architecture while keeping linewise vs characterwise behavior deterministic.

Alternative considered: ship mark jumps only, excluding operator motions. Rejected because users who set marks usually expect them to compose with delete/change/yank.

### Keep missing and invalid marks safe

Invalid slot keys clear the mark prefix and leave prompt text, cursor, selection, register, and stored marks unchanged. Missing marks no-op and clear the consumed pending mark action/operator. Incomplete prefixes only update pending state and render feedback.

Rationale: normal-mode printable keys are ignored today when unsupported. Mark support must not accidentally insert text or leave stale pending state that affects later commands.

Alternative considered: delegate invalid mark keys to Pi. Rejected because normal-mode printable keys should stay Vim-owned and safe.

## Risks / Trade-offs

- Mark positions can become stale after edits before the mark → clamp on use, document no full Vim adjustment, and add tests for deleted/shortened buffers.
- Dedicated mark pending state can conflict with operator pending state → model combined operator+mark pending explicitly and clear it after success or failure.
- Single quote/backtick may be wanted for future commands → reserve them as mark prefixes and document unsupported quote/backtick uses.
- Operator range edge cases can drift from visual selection behavior → route mark ranges through shared buffer helpers and add regression tests for forward/backward ranges.
- README/TODOS can claim support too early → update docs/TODOs only after tests, typecheck, and OpenSpec validation pass.

## Migration Plan

1. Add mark types, slot validation, pending mark state, and pure mark position helpers.
2. Teach normal-mode input handling to set marks and jump to marks.
3. Teach visual-mode input handling to jump to marks while preserving visual anchors.
4. Teach operator-pending handling to consume mark motions and apply characterwise or linewise ranges.
5. Add tests for setting, overwriting, jumping, visual selection, operator motions, stale marks, missing marks, invalid prefixes, and documentation.
6. Update README and `TODOS.md` after validation passes.
7. Run `bun test`, `bun run check-types`, and OpenSpec validation for `add-marks`.

Rollback: remove mark state/helpers/prefix handling and docs/TODO updates. Existing navigation, visual, operator-motion, and register tests should remain valid because mark behavior is additive.

## Open Questions

- None for initial implementation. Special/automatic marks and full edit-adjusted marks stay out of scope.
