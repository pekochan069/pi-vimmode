## 1. Types and Parser

- [ ] 1.1 Extend modal/types state with macro slots, active recording slot, last played slot, pending macro target state, and a `playMacro` effect.
- [ ] 1.2 Define valid macro slots as lowercase `a` through `z` and add helpers for slot validation and macro control detection.
- [ ] 1.3 Extend normal-mode input parsing/dispatch for `q{slot}`, recording stop `q`, `@{slot}`, `@@`, invalid targets, and no-op missing slots without overloading operator-motion state.
- [ ] 1.4 Add command/parser tests for macro prefix resolution, invalid targets, repeat-last parsing, and coexistence with existing operator/motion parsing.

## 2. Recording Semantics

- [ ] 2.1 Implement macro recording start/stop transitions that leave prompt text/cursor/mode unchanged and exclude start/stop control keys from stored tokens.
- [ ] 2.2 Append handled Vim-mode input tokens after successful handling while recording, including insert-mode text and handled `Esc`.
- [ ] 2.3 Exclude Pi-delegated application shortcuts and macro playback controls from stored tokens.
- [ ] 2.4 Preserve unnamed register state unless recorded edit commands themselves update it.
- [ ] 2.5 Add modal tests for lifecycle, insert-mode `q`, handled input capture, delegated input exclusion, register independence, and playback-while-recording ignore behavior.

## 3. Playback Semantics

- [ ] 3.1 Emit `playMacro` effects with stored token snapshots for `@{slot}` and update last-played slot only after a real macro slot is played.
- [ ] 3.2 Implement `@@` repeat-last behavior and no-op behavior before any successful playback.
- [ ] 3.3 Add adapter replay handling in `VimEditor` that feeds tokens through existing input handling with a replay guard.
- [ ] 3.4 Ignore nested playback commands during guarded replay and prevent replayed tokens from being recorded.
- [ ] 3.5 Add integration tests for recording insert+normal commands, replaying against changed prompt state, repeat-last playback, missing-slot no-op, and recursion guard behavior.

## 4. Status and Documentation

- [ ] 4.1 Extend status/view derivation to show a width-safe `REC <slot>` recording indicator when status UI is enabled.
- [ ] 4.2 Add status/view tests for active recording feedback and narrow-width rendering.
- [ ] 4.3 Update README normal-mode keymap, macro behavior, registers/undo notes, and limitations.
- [ ] 4.4 Update `TODOS.md` to mark `macro` complete only after implementation and validation pass.

## 5. Validation

- [ ] 5.1 Run `bun test` and fix failures.
- [ ] 5.2 Run `bun run check-types` and fix TypeScript errors.
- [ ] 5.3 Run OpenSpec validation for `add-macro-recording-playback` and fix artifact/spec issues.
