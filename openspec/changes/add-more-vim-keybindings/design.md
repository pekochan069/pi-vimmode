## Context

`pi-vimmode` currently implements insert/normal/visual/V-Line modes, core motions (`h/j/k/l`, `0/$`, `w/b`), single-key edits (`x`, `p`, `u`), and linewise `dd`/`yy`. Users still need common Vim prompt-editing shortcuts for opening lines, buffer boundaries, first non-blank movement, operator-motion edits, and line joins.

Implementation should stay extension-local, preserve Pi-owned shortcuts, and avoid full Vim emulation complexity.

## Goals / Non-Goals

**Goals:**

- Add high-frequency Vim bindings that improve multi-line prompt editing.
- Keep command parsing explicit and testable.
- Reuse existing buffer/register primitives where possible.
- Preserve current mode behavior, visual behavior, settings behavior, and Pi shortcut delegation.
- Document exact supported keymap.

**Non-Goals:**

- Full Vim grammar, counts, text objects, search, marks, macros, ex commands, named registers, or system clipboard.
- Block visual mode.
- Grapheme-perfect Vim semantics beyond current Pi cursor model.
- Remapping support or user-configurable keymaps.

## Decisions

### Decision: Add curated bindings, not full Vim grammar

Support specific high-value commands:

- Motions: `gg`, `G`, `^` and `_` for first non-blank, `%` for matching-pair jumps, keeping existing `0`, `$`, `w`, `b`.
- Insert/open: `o`, `O`.
- Operator motions: `d`, `c`, `y` with `w`, `b`, `0`, `^`, `$`, plus line aliases `dd`, `cc`, `yy`.
- Line shortcuts: `D`, `C`, `Y`, `J`.
- Paste before: `P`.

Rationale: gives practical Vim feel while keeping parser finite and easy to validate. Alternative considered: implement general Vim command grammar with counts/text objects. Rejected because prompt editor has smaller scope and must avoid shortcut conflicts/regressions.

### Decision: Extend parser around pending operators and motion targets

Update pending command state to include `d`, `c`, `y`, and `g`. Return typed command variants for line commands, operator-motion commands, aliases, and pending multi-key commands like `gg`. Keep unsupported pending combinations invalid and state-resetting.

Rationale: explicit command results keep `VimEditor` behavior readable and tests simple. Alternative considered: execute key handling inline in `VimEditor`; rejected because parser behavior already lives in `commands.ts` and should remain isolated.

### Decision: Add buffer helpers for line/open/join/range operations

Add pure helpers for:

- opening blank lines above/below with cursor placement,
- joining current line with next line,
- first non-blank column,
- matching `()`, `[]`, and `{}` pairs for `%`,
- building motion ranges for operator-motion edit/yank/delete,
- paste before for linewise and charwise registers.

Rationale: pure helpers enable unit tests and avoid relying only on integration tests. Alternative considered: mutate editor text directly in command handlers; rejected because range semantics are easier to regress.

### Decision: Keep operations within prompt text and delegate unknown controls

All new commands operate only on current prompt buffer and unnamed register. Non-printable and Pi application shortcuts continue to delegate unless explicitly handled.

Rationale: maintains current safety contract and avoids stealing Pi global UX.

## Risks / Trade-offs

- Operator-motion semantics differ from full Vim at edge cases → Document as supported prompt-editing semantics and cover with tests.
- More pending states could swallow printable keys unexpectedly → Invalid pending combinations MUST clear pending state without inserting text.
- `o`/`O` line opening can interact with empty prompts and final-line cursor positions → Cover empty, single-line, and multi-line cases in buffer tests.
- `J` join spacing may not match every Vim case → Use simple Vim-like one-space join and document behavior.
- `P` paste-before cursor placement can be subtle → Define exact charwise and linewise behavior in specs/tests.
