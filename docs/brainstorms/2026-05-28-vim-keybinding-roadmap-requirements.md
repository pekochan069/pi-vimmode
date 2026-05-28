---
date: 2026-05-28
topic: vim-keybinding-roadmap
---

# Vim Keybinding Roadmap Requirements

## Summary

pi-vimmode should add a staged set of high-value Vim keybindings, starting with everyday normal-mode editing speed, then movement/repeat power, then prompt-friendly text objects. The roadmap prioritizes commands that make composing and editing Pi prompts faster over full Vim parity.

---

## Problem Frame

pi-vimmode already covers the core modal editing loop, visual modes, registers, macros, common motions, and common operators. The next gap is not basic usability; it is the set of familiar Vim commands users reach for during fast prompt edits and small refactors.

Vim-fluent users expect numeric adjustment, counts, small substitutions, repeatable changes, find-on-line, and text objects to be available without thinking. Missing these commands creates friction precisely when users are editing prompts under flow.

---

## Actors

- A1. Vim-fluent Pi user: Edits prompts using normal-mode muscle memory and expects common Vim commands to work predictably.
- A2. Downstream planner/implementer: Uses this roadmap to break the work into coherent, testable implementation batches.

---

## Key Flows

- F1. Numeric prompt adjustment
  - **Trigger:** A user notices a number in the prompt that should be incremented or decremented.
  - **Actors:** A1
  - **Steps:** Move near the number, invoke increment or decrement, optionally use a count for larger adjustments.
  - **Outcome:** The number changes in place without switching to insert mode.
  - **Covered by:** R1, R2, R9

- F2. Counted normal-mode edit
  - **Trigger:** A user wants to repeat an existing motion or edit several times.
  - **Actors:** A1
  - **Steps:** Type a numeric count before a supported motion, operator, or edit command.
  - **Outcome:** The command applies the requested number of times using familiar Vim semantics.
  - **Covered by:** R2, R3, R9

- F3. Prompt-local rewrite with text objects
  - **Trigger:** A user wants to replace or yank a word, quoted phrase, or bracketed section inside a prompt.
  - **Actors:** A1
  - **Steps:** Use an operator with a text object such as inner word, around word, or quote/bracket object.
  - **Outcome:** The target region is changed, deleted, or yanked without manual visual selection.
  - **Covered by:** R7, R8, R9

---

## Requirements

**Phase 1: everyday editing speed**

- R1. Add normal-mode numeric increment and decrement bindings for `Ctrl+A` and `Ctrl+X`.
- R2. Add count prefixes for high-frequency commands where Vim users expect repetition, starting with motions, linewise operators, character deletion, substitution, and numeric increment/decrement.
- R3. Add the `e` word-end motion and make it available anywhere current word motions are useful, including operator-motion combinations.
- R4. Add single-character replacement with `r{char}`.
- R5. Add substitution commands: `s` changes the character under the cursor and enters insert mode; `S` changes the current line and enters insert mode.

**Phase 2: movement and repeat power**

- R6. Add line-local character search with `f`, `F`, `t`, and `T`, plus `;` and `,` to repeat the last character search forward or backward.
- R7. Add `.` repeat for the last completed change command, covering the common edit commands introduced or already supported.

**Phase 3: prompt-friendly text objects**

- R8. Add operator support for word text objects: `iw` and `aw`.
- R9. Add operator support for quote and bracket text objects for common prompt structures, including single quotes, double quotes, parentheses, brackets, and braces.

**Roadmap and configuration**

- R10. Preserve compatibility with Pi application shortcuts: control-key shortcuts continue delegating to Pi unless pi-vimmode explicitly owns the binding.
- R11. Keep new commands aligned with the existing configurable keymap model where doing so does not make the first implementation batch materially harder.
- R12. Document the staged roadmap and supported commands so users can tell which Vim behaviors are available now versus intentionally deferred.

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given the cursor is on or before `3`, when the user presses `Ctrl+A`, the number becomes `4`; when the user presses `5 Ctrl+X`, the number becomes `-1` or the Vim-compatible equivalent chosen during planning.
- AE2. **Covers R2.** Given normal mode and a prompt with several words, when the user types `3w`, the cursor moves forward three word motions rather than treating `3` as ignored input.
- AE3. **Covers R3.** Given the cursor is inside a word, when the user types `de`, the text from the cursor through the end of the word is deleted.
- AE4. **Covers R4.** Given the cursor is on a character, when the user types `rx`, that character is replaced with `x` and the editor remains in normal mode.
- AE5. **Covers R5.** Given the cursor is on a character, when the user types `s`, that character is removed and the editor enters insert mode at that position.
- AE6. **Covers R6.** Given a line contains a later `:`, when the user types `f:`, the cursor moves to that character; when the user then types `;`, the next matching `:` is targeted using the same search direction.
- AE7. **Covers R7.** Given the previous change replaced a character, when the user moves elsewhere and types `.`, the same change is applied at the new location.
- AE8. **Covers R8, R9.** Given the cursor is inside a quoted phrase, when the user types `ci"`, the phrase contents are changed without removing the surrounding quotes.
- AE9. **Covers R10.** Given a Pi control shortcut is not explicitly owned by pi-vimmode, when the user presses it, Pi receives the shortcut as before.

---

## Success Criteria

- Vim-fluent users can perform common prompt edits without repeatedly switching to insert mode or visual selection.
- The first implementation batch feels immediately useful on its own, even before text objects and repeat search land.
- Downstream planning can split the roadmap into testable increments without inventing command priority, user-facing behavior, or scope boundaries.
- Existing pi-vimmode behavior, settings, registers, macros, and Pi shortcut delegation remain stable unless a requirement explicitly changes them.

---

## Scope Boundaries

- Full Vim parity is not in scope for this roadmap.
- Ex commands, buffers/windows, registers beyond existing behavior, marks/jumps expansion, and advanced search UI are deferred.
- `/`, `?`, `n`, and `N` search are intentionally deferred despite being core Vim behaviors.
- Indentation commands, formatting commands, line duplication/move helpers, and broader prompt-transformation shortcuts are later polish, not part of the recommended first three phases.
- Implementation architecture, exact parser structure, internal data models, and file-level changes belong to planning, not this requirements document.

---

## Key Decisions

- Counts before text objects: Counts multiply the value of existing motions and operators and make pi-vimmode feel more naturally Vim-like early.
- Everyday editing plus prompt composition over full parity: High-frequency commands should win over niche completeness.
- Stage the work: Each phase should create useful behavior without depending on the full roadmap being complete.
- Defer search: Search is important, but it adds a larger interaction surface than the recommended first batch.

---

## Dependencies / Assumptions

- The existing modal editor can continue delegating unowned Pi control shortcuts while explicitly handling `Ctrl+A` and `Ctrl+X`.
- Count support can be introduced incrementally without requiring every existing command to support counts on day one.
- Text objects should initially focus on prompt-local structures users commonly edit: words, quotes, and brackets.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Technical] What exact Vim-compatible numeric parsing behavior should be supported for signs, leading zeroes, decimals, and numbers after the cursor?
- [Affects R2][Technical] Which existing commands should support counts in the first implementation slice versus a follow-up slice?
- [Affects R7][Technical] What is the safe boundary for `.` repeat in the presence of registers, macros, visual selections, and insert-mode text entry?
- [Affects R8, R9][Needs research] Which quote and bracket edge cases should be included in v1 text objects versus deferred?
