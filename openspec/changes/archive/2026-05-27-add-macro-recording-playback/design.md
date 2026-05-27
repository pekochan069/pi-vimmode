## Context

`VimEditor` is now a Pi adapter around a pure modal engine. The modal engine owns mode transitions, finite command parsing, register updates, and effects; the adapter applies edits/delegation through public Pi editor behavior. Macro support should reuse that boundary: record user input tokens, replay them through the same input path, and avoid storing Pi-specific editor effects.

Current limitations explicitly list macros as unsupported. The remaining adjacent TODOs, `registers` and `mark`, are still out of scope, so macro storage needs its own small extension-local model rather than full Vim register parity.

## Goals / Non-Goals

**Goals:**

- Support normal-mode macro recording with `q{slot}` and stop recording with `q` by default.
- Support normal-mode macro playback with `@{slot}` and repeat-last playback with `@@` by default.
- Support macro config for record/play keys, enabled state, allowed slots, and replay step cap.
- Record replayable prompt-editor inputs across normal, insert, visual, and visual-line modes.
- Keep macro slots in memory and independent from the unnamed yank/delete register.
- Reuse parser, modal engine, status derivation, and adapter effect application seams.
- Make recording/playback safe: no recursive playback, no recording Pi-delegated app shortcuts, no private Pi state access.
- Document supported macro behavior and remaining limitations.

**Non-Goals:**

- Full named registers for yanks/deletes, uppercase append registers, numeric registers, or system clipboard integration.
- Counts, recursive mappings, macro persistence across Pi sessions, or `.vimrc` / Vimscript macro loading.
- Recording prompt submission, abort shortcuts, autocomplete control, or other Pi-owned delegated behavior.
- Exact Vim edge-case parity for nested macro playback or recording playback commands inside another recording.

## Decisions

### Store macros as modal state, not adapter state

Extend modal state with a macro store: recording slot, slot-to-input-token arrays, and last played slot. Slots are extension-local macro slots, initially lowercase `a-z`, and do not share storage with the unnamed text register.

Rationale: macro state affects modal semantics and status, but it is still pure data. Keeping it in modal state makes tests TUI-free and avoids adding hidden state to `VimEditor`.

Alternative considered: store macros in `VimEditor` only. Rejected because parser/engine decisions would need adapter callbacks or duplicated state checks.

### Record input tokens after successful modal handling

Record the raw input token passed to `handleInput` after the engine handles it, not the resulting edit effect. Exclude macro control keys (`q{slot}`, stop `q`, `@{slot}`, `@@`) and inputs that delegate to Pi application behavior.

Rationale: replaying input tokens exercises the same parser, mode transitions, cursor restoration, buffer helpers, and status invalidation as live input. Storing effects would become stale against future buffer state and would couple macros to adapter internals.

Alternative considered: store semantic commands or edit results. Rejected because insert-mode text, visual selections, and cursor-dependent commands need current state at replay time.

### Model macro prefixes separately from operator pending state

Add finite parser/modal pending states for macro recording and playback prefixes instead of overloading `pendingOperator`. Configured record keys default to `q`; configured play keys default to `@`. Record key from normal mode starts `recordMacroTarget` unless already recording; play key starts `playMacroTarget`; pressing the play key twice resolves to repeat-last playback. Invalid target keys clear the pending macro state without editing text.

Rationale: macro prefixes are target-taking commands, not operators over motions. Separate pending state avoids confusing status text, operator-motion validation, and keymap behavior.

Alternative considered: treat `q` and `@` as ordinary configurable commands with ad-hoc follow-up logic in `VimEditor`. Rejected because command parsing already belongs below the adapter.

### Replay through an adapter effect with recursion guard

The engine returns a `playMacro` effect containing a snapshot of input tokens. The adapter applies it by feeding each token back through the existing input handler while a replay guard is active. During guarded replay, macro playback commands are ignored and recording is disabled for replayed tokens.

Rationale: the adapter already owns effect application and cursor restoration. A replay effect keeps the engine pure while preserving live semantics for edits and rendering.

Alternative considered: have the engine recursively call itself for every stored token. Rejected because effect application between tokens is adapter-owned and cursor/text snapshots must update after each token.

### Keep macro configuration shallow

Add `piVimMode.keymap.macros.record` and `piVimMode.keymap.macros.play` for control keys, plus `piVimMode.macros.enabled`, `slots`, and `maxReplaySteps` for behavior. Keep macro slots lowercase `a-z` only.

Rationale: macro controls are Vim grammar, but users need to avoid local key conflicts. Behavior options cover safety and scope without introducing persistent registers or full Vimscript behavior.

Alternative considered: only hard-code `q` and `@`. Rejected after user requested configurable macro behavior.

### Keep status feedback small and width-safe

When status UI is enabled and a recording is active, status shows the recording slot as a compact segment such as `REC a`. Playback does not need persistent status because it is immediate. Existing width-fitting behavior remains responsible for truncation.

Rationale: users need visible recording feedback to avoid accidental capture, but macro status should not require a new UI subsystem.

Alternative considered: add a new configurable status item. Deferred until users need explicit control over macro status placement.

## Risks / Trade-offs

- Macro slots are not full Vim registers → document separation from named registers and keep `registers` TODO open.
- Recording raw tokens can replay context-sensitive commands differently later → this is expected Vim-like behavior; cover cursor-dependent cases in tests.
- Insert-mode text may include multi-byte input tokens → store tokens exactly as Pi delivers them and replay through existing `handleInput` path.
- Pi-delegated shortcuts cannot be faithfully replayed → exclude them and document macros as prompt-editor behavior only.
- Active `visual-block-mode` change may add another mode before implementation → design macro state over `VimMode` generically so new modes can be recorded without special adapter work.
- Replay loops can become hard to reason about → ignore macro playback commands while replaying and add regression tests for recursion guards.

## Migration Plan

1. Extend modal state/types with macro store, pending macro target state, and `playMacro` effect.
2. Extend parser/engine tests for `q{slot}`, stop `q`, `@{slot}`, `@@`, invalid targets, missing slots, and recursion guard behavior.
3. Implement recording capture around modal updates, excluding macro control/delegated inputs.
4. Implement adapter replay effect by iterating stored tokens through existing input handling with a replay guard.
5. Add status/view tests for active recording feedback.
6. Add integration tests that record insert+normal commands and replay them against changed prompt text.
7. Update README supported keymap, macro limitations, and `TODOS.md` only after implementation passes validation.
8. Run `bun test`, `bun run check-types`, and OpenSpec validation.

Rollback: remove macro state/effects/parser branches and README/TODO updates. Existing modal editing, registers, visual behavior, and keymap configuration should remain isolated.
