## Context

`pi-vimmode` already has Ex command-line mode, visual range capture, a dedicated Ex render row, literal `:s`/`:substitute`, search highlights, unnamed/named registers, and prompt-buffer line operations. The parser and executor are currently substitution-shaped (`parseExSubstitution` returns only substitution results), so adding more commands should first generalize the Ex parser around a finite `ParsedExCommand` union instead of bolting command branches onto substitution parsing.

## Goals / Non-Goals

**Goals:**

- Add a finite, tested set of prompt-buffer Ex commands: `:delete`/`:d`, `:yank`/`:y`, `:put`/`:pu`, `:copy`/`:t`, `:move`/`:m`, `:join`/`:j`, and `:nohlsearch`/`:noh`.
- Preserve existing Ex command-line entry, editing, range, render-row, macro replay, and substitution behavior.
- Keep Ex commands prompt-local, line-oriented, and explicit about side effects on registers, search highlights, cursor placement, and dot-repeat.
- Reuse prompt-buffer operation helpers for text changes so line math and cursor clamping stay local to `src/buffer.ts`.

**Non-Goals:**

- Regex-capable substitution, `:global`, shell/file/window/buffer Ex commands, Vimscript evaluation, command history, repeat-substitution commands, semicolon ranges, range offsets, confirmation flags, and full Ex command-line editing.
- Explicit Ex register operands such as `:delete a` or `:put b`; this change uses the unnamed register only for Ex yank/delete/put.
- Recursive mappings or new keymap configuration.

## Decisions

### Generalize parser around `parseExCommand`

Replace or wrap `parseExSubstitution` with a parser that returns a discriminated union:

- `empty`
- `substitute`
- `delete`
- `yank`
- `put`
- `copy`
- `move`
- `join`
- `nohlsearch`
- `error`

Keep the existing substitution grammar and tests intact by either preserving `parseExSubstitution` as a compatibility wrapper or updating tests to target the substitution branch of `parseExCommand`.

Alternative rejected: add ad hoc command detection in `executeExCommand`. That would split grammar ownership between `src/ex.ts` and `src/modal/engine.ts`, making future Ex range fixes risky.

### Keep ranges shared, add destination parsing only for copy/move

Use the existing Ex range grammar for command ranges: omitted current line, `%`, visual `'<,'>`, numeric line, `.`, `$`, and comma ranges. Add a separate destination-address parser for `:copy`/`:t` and `:move`/`:m` that accepts `0`, numeric lines, `.`, and `$` as a single insertion target. Destination `0` means before the first line; other destinations mean after the addressed line.

Alternative rejected: support destination ranges, visual markers, offsets, or semicolon ranges now. Those expand grammar without being required for common copy/move commands.

### Implement line commands in prompt-buffer helpers

Add buffer helpers that operate on `LineRange` and destination addresses:

- delete addressed lines and return a linewise unnamed register payload
- yank addressed lines into a linewise register payload
- put unnamed register content after range end
- copy addressed lines before/after destination according to destination address
- move addressed lines before/after destination, rejecting destinations inside the moved range
- join addressed lines into one line with Vim-like single-space joining

`join` uses special default semantics: omitted range joins the current line with the next line; explicit ranges join only the addressed lines.

Alternative rejected: compose these operations inside modal engine from raw line arrays. Buffer helpers already own split/join/clamp behavior and are easier to unit test.

### Side effects stay finite and visible

- `:delete` writes the deleted linewise text to the unnamed register.
- `:yank` writes addressed linewise text to the unnamed register without editing prompt text.
- `:put` reads only the unnamed register; missing or empty register is a safe no-op with a readable Ex error.
- `:copy`, `:move`, `:put`, `:delete`, and `:join` clear visible search highlights only when prompt text changes.
- Ex text edits do not update dot-repeat.
- `:nohlsearch` clears visible search highlights but preserves last-search state so `n`/`N` still repeat.

Alternative rejected: mirror all Vim register operand semantics now. Existing named-register behavior is stable, but Ex register operands add parsing and append semantics that can be a later focused change.

### Status messages remain lightweight

Use transient Ex row messages for success and errors:

- `N lines deleted`
- `N lines yanked`
- `N lines copied`
- `N lines moved`
- `N lines joined`
- `N lines put`

`:nohlsearch` closes the row without a success message. Errors use specific messages such as `Missing Ex destination`, `Invalid Ex destination`, `Ex move destination overlaps range`, and `Register is empty`.

Alternative rejected: add a command-output buffer or persistent message history. Current Ex row already handles transient feedback and keeps scope small.

## Risks / Trade-offs

- More Ex aliases may look like full Vim parity → Mitigation: docs and specs list supported aliases exactly and keep unsupported commands as Ex errors.
- Destination `0` is destination-only, not a general range address → Mitigation: parser has separate range and destination functions with tests for `0` rejection in ranges and acceptance in destinations.
- Move/copy line math can drift around overlapping ranges → Mitigation: implement in `src/buffer.ts` with focused unit tests for before, after, top, bottom, and overlap cases.
- Ex delete/yank register behavior could surprise users expecting named operands → Mitigation: document unnamed-only v1 behavior and leave named Ex operands in limitations.
- `:nohlsearch` could accidentally clear repeat-search state → Mitigation: test that highlights clear while `n`/`N` still repeat prior search.

## Migration Plan

No data migration. Implement behind existing `:` Ex command-line path. Existing substitution commands remain compatible. Rollback is removing new parser branches and buffer helpers while keeping substitution branch unchanged.

## Open Questions

None for v1. Named Ex register operands, offsets, semicolon ranges, and command history remain deferred TODOs.
