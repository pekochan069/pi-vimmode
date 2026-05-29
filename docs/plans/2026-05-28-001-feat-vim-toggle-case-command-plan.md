---
title: "feat: Add Vim toggle-case command"
type: feat
status: completed
date: 2026-05-28
origin: docs/brainstorms/2026-05-28-vim-keybinding-roadmap-requirements.md
---

# feat: Add Vim toggle-case command

## Summary

Add Vim normal-mode `~` support to pi-vimmode as a configurable semantic command. The command toggles character case in the prompt buffer, supports counts through the existing normal-command parser, records itself as a repeatable change for `.`, and updates user-facing keymap documentation.

---

## Problem Frame

The Vim keybinding roadmap frames pi-vimmode as practical prompt editing rather than full Vim parity. `~` is outside the current roadmap batch, but it fits the same high-frequency normal-mode editing goal: users can fix casing while staying in flow and without switching to insert mode.

---

## Requirements

- R1. Pressing `~` in normal mode toggles the case of the character under the cursor and keeps the editor in normal mode.
- R2. Count prefixes apply to `~`, so `3~` toggles up to three characters from the cursor using existing count parsing.
- R3. `~` records a repeatable change when it changes text, so `.` can replay the same toggle-case command at a later cursor position.
- R4. `toggleCase` is exposed through the configurable keymap model and has default binding `~`.
- R5. Non-letter characters, empty buffers, line endings, and multiline prompts have explicit, tested behavior.
- R6. README command tables, keymap examples, supported command action lists, and limitations stay aligned with behavior.
- R7. Existing modal behavior, registers, macros, visual modes, Pi shortcut delegation, and roadmap commands remain stable.

**Origin actors:** A1 Vim-fluent Pi user; A2 downstream planner/implementer.
**Origin flows:** The origin's normal-mode editing and counted-command goals inform R1-R3, though `~` is a plan-local addition rather than an origin requirement.
**Origin acceptance examples:** AE2 informs count behavior; AE7 informs repeat behavior; AE9 informs shortcut delegation stability.

---

## Scope Boundaries

- This plan adds normal-mode `~` only; it does not implement the roadmap's numeric adjustment, `e`, `r`, `s`, search, text objects, or other staged bindings.
- This plan does not add visual-mode `~` or g-prefixed case commands such as `g~`, `gu`, or `gU`.
- This plan does not attempt full Vim Unicode case-mapping parity. Behavior should be documented around the implemented string casing semantics.
- This plan does not change Pi protected shortcut delegation beyond adding a printable `~` normal-mode binding.
- This plan does not add new settings surfaces beyond the existing keymap command-action model.

### Deferred to Follow-Up Work

- Roadmap-wide keybinding batches from the origin document remain separate follow-up work.
- Visual selection case transforms and operator-form case transforms (`g~{motion}`) should be considered separately if users need broader casing workflows.

---

## Context & Research

### Relevant Code and Patterns

- `src/commands.ts` owns finite normal-mode key parsing through `resolveNormalCommand`, count handling, and semantic keymap lookup.
- `src/types.ts` defines semantic action unions that should gain `toggleCase` rather than adding raw-key branching.
- `src/config.ts` defines `VIM_COMMAND_ACTIONS`, `DEFAULT_VIM_KEYMAP`, parsing, validation, and `cloneKeymap`; all must include the new command.
- `src/buffer.ts` owns pure text-buffer operations such as `replaceCharAt`, `substituteCharAt`, and numeric adjustment helpers.
- `src/modal/engine.ts` maps semantic commands to buffer operations and stores `RepeatableChange` entries through `withRepeatableChange`.
- `test/commands.test.ts`, `test/config.test.ts`, `test/buffer.test.ts`, `test/modal.test.ts`, and `test/vim-editor.test.ts` already cover the parser/config/buffer/modal/live-editor layers.
- `README.md` documents normal-mode commands, keymap JSON examples, supported command actions, and roadmap limitations.

### Institutional Learnings

- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md`: add keybindings through explicit semantic command types, pure buffer helpers, modal effects, and layered tests.
- `docs/solutions/architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md`: keep string surgery and cursor clamping in buffer operations, not adapter-level code.
- `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md`: pair pure modal coverage with live `VimEditor` coverage so documented/editor behavior does not drift.
- `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md`: keymap/config additions must survive cloning, parsing, examples, and live editor option flow.

### External References

- None. Local command-parser and keymap patterns are strong enough for this scoped addition; exact full-Vim parity is intentionally out of scope.

---

## Key Technical Decisions

- Model `~` as semantic command `toggleCase`: this preserves the configurable keymap architecture and avoids a raw-key special case in the modal engine.
- Put casing logic in a pure buffer helper: this follows existing prompt-buffer operation boundaries and makes cursor/count behavior easy to test without Pi editor adapters.
- Support counts and dot-repeat in the first slice: the user confirmed Vim normal-mode semantics, and the existing parser/repeat infrastructure makes these expected behaviors cheaper than deferring them.
- Limit operation to the current line: this matches prompt-editing safety and avoids surprising cross-line edits when a count exceeds remaining characters.
- Treat only text changes as repeatable changes: no-op invocations at empty buffers, line endings, or ranges with no case-changing characters should not overwrite the previous repeatable command.
- Document casing limitations explicitly: JavaScript string casing behavior may not match all Vim/locale Unicode edge cases, so docs and tests should define the supported contract.

---

## Open Questions

### Resolved During Planning

- Should count and dot-repeat be included? Yes. User confirmed full normal-mode case-toggle scope with counts and `.` repeat.
- Should `~` be part of the configurable keymap? Yes. Existing architecture treats normal-mode bindings as semantic actions, and README exposes command actions.
- Should broader roadmap commands land with this? No. The plan is intentionally scoped to `~` only.

### Deferred to Implementation

- Exact helper name and internal casing predicate: implementation can choose names that fit nearby `src/buffer.ts` conventions.
- Exact cursor clamp formula at line end after a counted operation: implementation should settle it while writing tests, preserving the user-visible contract in this plan.

---

## Implementation Units

### U1. Add toggle-case command to keymap parsing and config

**Goal:** Expose `toggleCase` as a supported semantic command with default binding `~` and keep custom keymap parsing/cloning aligned.

**Requirements:** R2, R4, R7

**Dependencies:** None

**Files:**

- Modify: `src/types.ts`
- Modify: `src/config.ts`
- Test: `test/commands.test.ts`
- Test: `test/config.test.ts`

**Approach:**

- Add `toggleCase` to the command-action type surface.
- Add `toggleCase` to `VIM_COMMAND_ACTIONS` and `DEFAULT_VIM_KEYMAP.commands` with `~` as the default binding.
- Ensure `cloneKeymap` and parsed settings preserve the new command's bindings.
- Rely on existing exact binding and count-prefix parsing rather than adding a special parser branch.

**Execution note:** Start with parser/config tests for default binding, custom binding, and count prefix before changing the type/config surface.

**Patterns to follow:**

- Existing `replaceChar`, `substituteChar`, and `incrementNumber` command-action entries in `src/types.ts` and `src/config.ts`.
- Existing configured semantic command tests in `test/commands.test.ts`.
- Existing default keymap and configured keymap tests in `test/config.test.ts`.

**Test scenarios:**

- Happy path: default keymap resolves `~` in normal mode to command `toggleCase` with count `1`.
- Happy path: `3~` resolves to command `toggleCase` with count `3` using the existing count prefix state.
- Happy path: a configured binding such as `commands.toggleCase = ["<A-t>"]` resolves to `toggleCase` without requiring `~`.
- Edge case: an invalid/protected configured binding for `toggleCase` falls back consistently with other command actions and reports the same warning style.
- Integration: parsed settings passed through keymap cloning preserve `toggleCase` bindings instead of dropping the new field.

**Verification:**

- `toggleCase` is accepted anywhere command actions are enumerated.
- Default and custom bindings resolve through existing parser code paths.
- Existing command bindings still parse unchanged.

---

### U2. Implement pure buffer toggle-case behavior

**Goal:** Provide a pure prompt-buffer operation that toggles case over the requested count, returns explicit cursor position, and reports whether text changed.

**Requirements:** R1, R2, R5

**Dependencies:** U1

**Files:**

- Modify: `src/buffer.ts`
- Test: `test/buffer.test.ts`

**Approach:**

- Add a buffer helper that accepts text, cursor, and count, then toggles up to count characters from the cursor within the current line.
- Toggle lowercase letters to uppercase and uppercase letters to lowercase according to the chosen string casing predicate.
- Leave non-case-changing characters unchanged while still consuming their position for count semantics, unless implementation tests reveal a stronger nearby convention.
- Clamp behavior safely for empty text, cursor at line ending, and counts larger than remaining line length.
- Return an `EditResult`-style shape with text, cursor, and changed status matching nearby helpers.

**Execution note:** Add characterization-style tests around cursor/count behavior before wiring the helper into the modal engine.

**Patterns to follow:**

- `replaceCharAt` and `substituteCharAt` result shape and cursor normalization in `src/buffer.ts`.
- Existing buffer operation tests for direct text/cursor assertions in `test/buffer.test.ts`.

**Test scenarios:**

- Happy path: text `abc`, cursor on `a`, count `1` produces `Abc` and moves cursor according to the documented `~` contract.
- Happy path: text `AbC`, cursor on `A`, count `3` produces `aBc` without crossing the line.
- Edge case: count larger than remaining line toggles only available characters on the current line.
- Edge case: cursor at line ending or empty buffer produces no text change and reports `changed: false`.
- Edge case: non-letter characters inside the counted span remain unchanged while surrounding letters toggle as expected.
- Edge case: multiline text with cursor near a newline does not toggle characters on the next line.
- Error path: out-of-range cursor input is normalized or no-ops consistently with nearby buffer helpers.

**Verification:**

- Buffer behavior is deterministic without modal-engine state.
- Count, line boundary, no-op, and cursor outcomes are covered by direct unit tests.

---

### U3. Wire toggle-case into normal-mode modal behavior and repeat

**Goal:** Make normal-mode `~` edit the buffer, keep normal mode active, and integrate with existing repeatable-change state.

**Requirements:** R1, R2, R3, R5, R7

**Dependencies:** U1, U2

**Files:**

- Modify: `src/modal/engine.ts`
- Test: `test/modal.test.ts`
- Test: `test/vim-editor.test.ts`

**Approach:**

- Import and invoke the new buffer helper from the `applyCommand` command switch.
- Emit the same edit/cursor effect shape used by nearby single-command edits.
- Store `{ type: "command", command: "toggleCase", count }` through `withRepeatableChange` only when the helper reports a text change.
- Let `.` replay the semantic command through existing repeat logic instead of adding command-specific repeat code.
- Keep macro/register/visual state untouched except for normal command recording paths that already apply to command inputs.

**Execution note:** Implement modal behavior test-first because this unit defines the user-visible contract.

**Patterns to follow:**

- `incrementNumber`, `decrementNumber`, `replaceChar`, and `substituteChar` cases in `src/modal/engine.ts`.
- Repeatable command handling through `withRepeatableChange` and existing `.` tests in `test/modal.test.ts`.
- Live adapter smoke patterns in `test/vim-editor.test.ts`.

**Test scenarios:**

- Happy path: normal-mode `~` toggles the current character and remains in normal mode.
- Happy path: `3~` toggles exactly the expected current-line span and leaves cursor in the documented final position.
- Happy path: after `~`, moving to another character and pressing `.` applies the same toggle-case command at the new cursor.
- Edge case: `~` at end of line or empty prompt no-ops and does not replace a prior repeatable change.
- Edge case: repeated `.` after a counted `3~` preserves count semantics.
- Integration: live `VimEditor` receives `~`, applies the edit, restores cursor state, and preserves configured keymap behavior.
- Integration: existing insert mode literal `~` input remains literal text entry rather than a normal-mode command.

**Verification:**

- User-visible modal and live-editor tests prove `~`, `3~`, and `.` behavior.
- Existing modal tests for adjacent edit commands continue to pass.

---

### U4. Update documentation and supported-command references

**Goal:** Keep user-facing docs and roadmap limitations aligned with the new command and its explicit semantics.

**Requirements:** R4, R6, R7

**Dependencies:** U1, U2, U3

**Files:**

- Modify: `README.md`
- Optional modify: `docs/brainstorms/2026-05-28-vim-keybinding-roadmap-requirements.md`

**Approach:**

- Add `~` to the normal-mode command table with count-aware case-toggle wording.
- Add `toggleCase` to the README keymap JSON example and supported command-action list.
- Update limitations to state the supported `~` casing contract and any non-goal around full Vim Unicode/visual/operator casing parity.
- Avoid rewriting the origin roadmap unless the implementation team wants the roadmap to list `~` as an added sidecar command; the active behavior belongs in README.

**Patterns to follow:**

- Existing README entries for `r{char}`, `s`, `S`, numeric adjustment, and repeat.
- Existing README keymap settings block and supported command-action list.

**Test scenarios:**

- Test expectation: none -- this unit is documentation-only. The behavioral guarantees are tested in U1-U3.

**Verification:**

- README tells users that `~` exists, how counts affect it, how to remap it, and what casing limitations remain.
- No docs imply unsupported visual/operator-form case transformations.

---

## System-Wide Impact

- **Interaction graph:** The change flows through keymap parsing, modal command application, buffer editing, repeat state, and the live editor adapter. No lifecycle hooks or renderer surfaces should change.
- **Error propagation:** Invalid keymap settings should continue using existing per-field fallback and warning behavior. Runtime command no-ops should not surface user-facing errors.
- **State lifecycle risks:** The only persistent modal-state change is `lastRepeatableChange`, and it should update only after actual text changes.
- **API surface parity:** `VimCommandAction`, `VIM_COMMAND_ACTIONS`, default keymap, config parser, clone logic, README examples, parser tests, and live editor behavior must all agree on `toggleCase`.
- **Integration coverage:** Live-editor smoke coverage is required because prior project learning shows pure modal tests can drift from adapter behavior.
- **Unchanged invariants:** Register contents, macro storage, visual selections, protected shortcuts, and insert-mode printable input remain unchanged by this normal-mode command.

---

## Risks & Dependencies

| Risk                                                                 | Mitigation                                                                                                              |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Cursor behavior differs from Vim or from nearby helpers              | Define the expected cursor result in buffer and modal tests before wiring docs.                                         |
| JavaScript string casing surprises users on locale-sensitive Unicode | Document the supported casing contract and avoid claiming full Vim Unicode parity.                                      |
| Config schema accepts `toggleCase` but clone/default/docs omit it    | Treat config as a unit across `types`, `config`, parser tests, config tests, README examples, and live editor coverage. |
| `~` overwrites repeat state on no-op                                 | Gate `withRepeatableChange` on `changed`, matching existing command patterns.                                           |
| Count toggles across newlines unexpectedly                           | Limit helper to current line and test multiline boundaries.                                                             |

---

## Documentation / Operational Notes

- No rollout, migration, or operational work is required.
- README should remain the source of truth for supported Vim commands after this lands.
- The origin roadmap can remain unchanged unless maintainers want to add `~` as an explicit roadmap-completed command.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-28-vim-keybinding-roadmap-requirements.md](../brainstorms/2026-05-28-vim-keybinding-roadmap-requirements.md)
- Related code: `src/commands.ts`
- Related code: `src/config.ts`
- Related code: `src/types.ts`
- Related code: `src/buffer.ts`
- Related code: `src/modal/engine.ts`
- Related tests: `test/commands.test.ts`
- Related tests: `test/config.test.ts`
- Related tests: `test/buffer.test.ts`
- Related tests: `test/modal.test.ts`
- Related tests: `test/vim-editor.test.ts`
- Related docs: `README.md`
- Institutional learning: `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md`
- Institutional learning: `docs/solutions/architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md`
- Institutional learning: `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md`
- Institutional learning: `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md`
