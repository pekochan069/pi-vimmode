## Context

Current Ex support is finite and prompt-local. `src/ex.ts` parses explicit Ex command variants; `src/range.ts` owns finite range algebra; `src/buffer.ts` owns prompt-buffer edits; modal code owns side effects; `src/vim-editor.ts` renders the shared search/Ex/message workbench row. Archived changes already shipped regex pattern mode via `r`, address offsets, semicolon ranges, destination offsets, shared workbench history, and substitution preview/apply.

`TODOS.md ## Ex Commands` is therefore partly stale. Real remaining gaps are repeat substitution, practical safe substitution flags beyond `g`/`i`/`r`, Ex register operands, richer Ex input editing, configurable reserved workbench rows, and modal handler size.

## Goals / Non-Goals

**Goals:**

- Reconcile stale TODOs/docs with source-backed behavior before adding new Ex work.
- Extend Ex substitution with finite safe behavior: count-only/no-error flags and repeat-substitution commands.
- Let `:delete`, `:yank`, and `:put` use named registers without changing default unnamed-register behavior.
- Improve command-line editing by adding cursor-aware operations to the existing pending-Ex state.
- Add `piVimMode.ui.workbench.reservedRows` so users can reserve one or more workbench rows below the prompt.
- Extract Ex/search/normal/visual command-handler helpers so new behavior does not deepen already-large functions.

**Non-Goals:**

- Full Vimscript, arbitrary Ex dispatch, `:global`, shell/file/window/buffer commands, `.vimrc`, or Neovim Lua.
- Replacement expansion for `&`, `$1`, or `\1`; replacements stay literal.
- Interactive confirmation flag `c` and print/list flags `p`, `#`, `l`; those need a multi-row or pager design.
- Embedding the main Pi prompt editor as a second editor inside Ex command-line mode.

## Decisions

### 1. Treat TODO completion as cleanup plus bounded extensions

Target seams: `TODOS.md`, `docs/features.md`, `openspec/specs/vim-ex-command-line/spec.md`, parser/tests.

Decision: mark already-shipped TODOs complete only after tests/docs prove behavior exists. Do not reimplement regex substitution, offsets, semicolon ranges, or history. Fix stale docs that still list those capabilities as limitations.

Alternatives considered:

- Rebuild all unchecked TODOs from scratch: rejected because it duplicates archived work and increases regression risk.
- Ignore TODO/docs drift: rejected because future proposals would keep rediscovering the same shipped behavior.

### 2. Add substitution flags as an explicit typed subset

Target seams: `src/ex.ts`, substitution execution in modal/buffer helpers, `test/ex.test.ts`, `test/modal.test.ts`, `docs/features.md`.

Decision: extend parsed substitutions with explicit booleans for safe flags:

- `n`: count matches only; leave prompt text unchanged, exit Ex mode with a count message, and do not create an apply preview because there is no mutation to confirm.
- `e`: suppress no-match errors; leave prompt text unchanged and show a non-error zero-match message.
- Existing `g`, `i`, and `r` behavior remains unchanged.

Unsupported flags continue to fail closed with readable Ex errors.

Alternatives considered:

- Add all Vim substitution flags: rejected; confirmation and print flags imply interactive UI/message surfaces not present in the prompt workbench.
- Treat unknown flags as ignored: rejected; finite parser must not imply broader Vim compatibility.

### 3. Store semantic last substitution for repeat commands

Target seams: `src/modal/types.ts`, `src/ex.ts`, `src/modal/ex-command-line.ts`, substitution executor tests.

Decision: add modal state for the last successfully applied substitution, separate from `exHistory`. Store parsed substitution semantics needed to repeat safely: pattern, replacement, matcher mode, flags, and original command text for diagnostics. Repeat commands (`:&` and `:&&`) resolve the current or explicit range, reuse stored semantics, and still use the existing preview/apply path before any mutation. If no prior successful substitution exists, repeat commands report a readable Ex error and do not edit.

Count-only/no-match-suppressed commands do not become the last substitution because they do not apply replacement semantics. Identical replacements that match count as successful substitutions, matching existing success behavior.

Alternatives considered:

- Use `exHistory` as repeat source: rejected because history is text recall, not semantic state, and may contain non-substitution commands.
- Apply repeats immediately: rejected because all substitution mutations must keep preview/apply safety.

### 4. Add Ex register operands through existing register helpers

Target seams: `src/ex.ts`, `src/modal/registers.ts`, Ex line-command execution, `test/ex.test.ts`, `test/modal.test.ts`, `openspec/specs/vim-named-registers/spec.md`.

Decision: parse one optional alphabetic register operand for `delete`, `yank`, and `put`:

- `:delete a` / `:yank a`: write addressed linewise text to named register `a` and also update the unnamed register, matching normal named-register write behavior.
- `:delete A` / `:yank A`: append linewise text to named register `a` and update the unnamed register with only the newly addressed text.
- `:put a` / `:put A`: read named register `a`; uppercase reads the lowercase slot and does not append.
- No operand preserves current unnamed-register behavior.

Only the plain trailing register form is supported. Vim-style quoted operands such as `:delete "a` stay unsupported unless a future spec proposes them.

Alternatives considered:

- Ex named writes bypass the unnamed register: rejected because current normal/visual named-register behavior always also updates unnamed.
- Accept arbitrary trailing operands: rejected; parser must remain finite and exact.

### 5. Use a bounded command-line editing helper, not a nested full editor

Target seams: `src/modal/ex-command-line.ts`, `src/modal/types.ts`, command key helpers, modal tests.

Decision: add cursor-aware editing to pending Ex state through a pure helper. `PendingExCommand` gains a cursor index. Printable input inserts at the cursor; Backspace/Delete remove around the cursor; Left/Right/Home/End and word-left/word-right/delete-word commands operate on the command string. History recall replaces the command and moves the cursor to the end. Any edit clears pending substitution preview.

Alternatives considered:

- Reuse `VimEditor`/Pi `CustomEditor` directly for Ex input: rejected because Ex input is modal state with visual-source restoration, preview state, and history semantics; embedding another editor would cross adapter boundaries and risk prompt-buffer mutation.
- Keep append-only input: rejected because the TODO explicitly asks to improve command-line editing and append-only editing makes command corrections costly.

### 6. Configure reserved workbench rows in the existing `ui` tree

Target seams: `src/types.ts`, `src/config.ts`, `src/vim-editor.ts`, render/config tests, `docs/settings.md`, `docs/features.md`.

Decision: add `piVimMode.ui.workbench.reservedRows` as a bounded non-negative integer, default `0`. Active search/Ex/message workbench content still needs at least one row. Rendering reserves `max(activeWorkbenchRows, reservedRows)` rows below the prompt; blank reserved rows remain width-safe and keep prompt viewport height stable. v1 content remains single-row; extra reserved rows are layout reservation only.

Invalid fields fall back field-by-field with warnings. `cloneOptions()` must preserve the new `ui.workbench` tree, and live `VimEditor` tests must prove resolved config reaches rendering.

Alternatives considered:

- Add Vim-style `cmdheight`: rejected because this project uses Pi-native `piVimMode.ui` as the single config surface.
- Make one row reserved by default: rejected because it would visibly shrink existing prompts for all users.

### 7. Extract modal handlers before adding behavior branches

Target seams: `src/modal/engine.ts`, `src/modal/normal.ts`, `src/modal/ex-command-line.ts`, tests.

Decision: perform behavior-preserving extraction around Ex execution, normal command application, and visual input handling before adding new features. Keep pure helpers near their domain and avoid widening `VimEditor`. This is implementation structure, not a behavior capability.

Alternatives considered:

- Add features directly to current large handlers: rejected because `applyCommand`, `handleNormalInput`, and `handleVisualInput` already exceed the project guideline and are easy to regress.
- Large architecture rewrite: rejected; extract only seams needed for this change.

## Risks / Trade-offs

- Repeat substitution can surprise users with unintended edits → keep preview/apply required for repeats and show clear count messages.
- Register operand semantics can drift from normal-mode registers → reuse existing register helpers and test lowercase, uppercase append, missing register, and unnamed preservation.
- Command-line cursor state can desync preview/history → every command-text mutation clears preview and clamps cursor.
- Reserved rows can introduce viewport off-by-one bugs → test tiny heights, width truncation, active rows, idle reserved rows, status UI, visual selection, and search highlight composition.
- Config fields can parse but not reach live editor → update `src/types.ts`, `src/config.ts`, option cloning, docs, and live editor construction tests together.
- TODO/docs cleanup can mask real future work → leave unsupported flags and full parity explicitly documented as limitations/non-goals.

## Migration Plan

1. Add tests that prove already-shipped TODO items exist, then update `TODOS.md` and stale feature-doc limitations.
2. Extract oversized modal helpers with no behavior change and run focused tests.
3. Add parser/state support for substitution flags and repeat commands, then integrate with preview/apply.
4. Add register operands through existing register helpers.
5. Add command-line cursor editing helper and tests.
6. Add `ui.workbench.reservedRows` parsing/rendering/docs.
7. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback is simple: remove the new config field and parser branches, keep behavior-preserving cleanup if already validated. No data migration or dependency migration is required.

## Open Questions

- No user-blocking questions. The finite scope intentionally defers confirmation/print flags and full nested prompt-editor reuse to future changes if demand appears.
