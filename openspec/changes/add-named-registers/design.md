## Context

The extension currently supports one extension-local unnamed register shared by normal, visual, visual-line, and visual-block operations. `src/modal/engine.ts` owns mode transitions, pending command handling, and register updates; `src/buffer.ts` returns `VimRegister` values from pure text operations; `VimEditor` applies adapter effects. An active macro proposal keeps macro slots separate from edit registers, so named registers must not reuse or collide with macro recording storage.

## Goals / Non-Goals

**Goals:**

- Add Vim-style `"{slot}` named edit register prefixes for supported prompt-editing operations.
- Support lowercase replace writes and uppercase append writes for alphabetic slots.
- Keep the unnamed register as the default register and update it on every yank/delete/change.
- Keep register storage in modal state so parser/engine tests stay TUI-free.
- Preserve existing keymap customization, visual modes, block visual behavior, and Pi shortcut delegation.
- Document behavior and remove the named-registers limitation only after implementation validates.

**Non-Goals:**

- Numeric registers, black-hole register, small-delete register, expression register, system clipboard registers, or special Vim registers.
- Register persistence across editor instances or Pi sessions.
- Register display UI beyond existing status/pending feedback.
- Changing macro recording storage or making macros share edit-register contents.
- Full Vimscript/register command parity.

## Decisions

### Store named edit registers in modal state

Extend `ModalState` with a named register store keyed by lowercase `a-z`, plus a one-shot pending register target. Keep `register` as the unnamed register for compatibility with existing paste paths and tests.

Rationale: modal state already owns supported Vim semantics, register updates, pending state, and testable pure data. The adapter should not decide which register receives edit text.

Alternative considered: store named registers in `VimEditor`. Rejected because visual/operator commands would need adapter callbacks or duplicated post-processing.

### Treat `"{slot}` as a mode-local one-shot target

Handle `"` as a register-prefix introducer in normal and visual modes. A valid alphabetic slot records `{ slot: lowercase(slot), append: slot is uppercase }`; the following supported yank/delete/change/paste command consumes the target and clears it. Invalid targets clear the prefix and leave prompt text/cursor unchanged.

Rationale: register prefixes compose with existing commands without becoming operators or motions. Keeping this target separate from operator-motion pending state avoids corrupting configured keymap prefix parsing.

Alternative considered: encode register prefixes into `pending` strings used by `resolveNormalCommand()`. Rejected because visual-mode operator handling also needs the prefix, and mixing register target state with keymap sequence state would make invalid-prefix cleanup brittle.

### Use write-through semantics for edit operations

Create helper functions that apply operation-produced `VimRegister` values to state. Every yank/delete/change updates the unnamed register. If a pending named target exists, the same operation also writes or appends to that named register. Lowercase targets replace; uppercase targets append to the lowercase register.

Rationale: Vim users expect unnamed paste to continue reflecting the most recent edit even when a named register was specified. One helper keeps normal, visual, and block operations consistent.

Alternative considered: targeting a named register prevents unnamed update. Rejected because it diverges from common Vim register behavior and would surprise users who mix `"ay` with `p`.

### Define append behavior with explicit type rules

Appending to an empty or missing register stores the incoming register unchanged. Appending two characterwise registers concatenates text. Appending any linewise register produces a linewise register with non-empty register texts joined by one newline boundary.

Rationale: existing `VimRegister` only distinguishes `char` and `line`; these rules keep linewise paste behavior predictable while allowing simple tests for mixed-type append cases.

Alternative considered: match every Vim append edge case exactly. Rejected because prompt editing lacks full Vim register types and special registers.

### Read named registers only for prefixed paste

`p` and `P` without a pending named target continue to use the unnamed register. `"{slot}p` and `"{slot}P` read the lowercase slot for both lowercase and uppercase slot inputs. Missing or empty named registers no-op through existing paste helpers.

Rationale: this preserves current behavior and makes uppercase meaningful only for write commands, not paste commands.

Alternative considered: uppercase paste appends first or errors. Rejected because paste should only read register contents.

### Keep macros and edit registers separate

Macro slots remain owned by macro state from the macro change. Named edit registers use a distinct field/type and parser path. `q{slot}` records macros; `"{slot}` targets edit registers.

Rationale: Vim has related concepts, but this extension already scoped macros independently. Keeping storage separate avoids hidden coupling and simplifies rollout ordering.

Alternative considered: unify macros and registers under one store. Rejected because macro payloads are input-token arrays while edit registers are typed text.

## Risks / Trade-offs

- Prefix parsing can conflict with future quote commands → keep `"` reserved only as register prefix and document unsupported quote uses.
- Uppercase append mixed-type behavior may not match every Vim edge case → specify deterministic prompt-editor semantics and test them.
- Visual and normal paths can drift → route all register writes through shared modal helpers.
- Active macro work may touch the same parser/state files → keep edit-register state names distinct and avoid changing macro-slot assumptions.
- Large modal helpers can exceed readability limits → extract register target/write/read helpers so functions stay under the 100-line rule.

## Migration Plan

1. Add register target/store types and helper functions for slot validation, target consumption, write-through, append, and read.
2. Teach normal and visual handlers to accept `"{slot}` before supported register-aware commands while preserving existing pending operator behavior.
3. Route normal, visual, visual-line, and visual-block yank/delete/change paths through shared register write helpers.
4. Route normal paste and any existing visual paste replacement through shared register read helpers.
5. Add parser/modal/buffer/integration tests for replace, append, paste, invalid targets, missing registers, visual operations, and macro separation.
6. Update README and `TODOS.md` after tests and typecheck pass.
7. Run `bun test`, `bun run check-types`, and OpenSpec validation for `add-named-registers`.

Rollback: remove named-register state/helpers/prefix handling and docs/TODO updates. Existing unnamed-register tests should remain valid because unnamed state is preserved.

## Open Questions

- None for initial implementation. Special registers and persistence stay out of scope.
