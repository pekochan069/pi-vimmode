## Context

`pi-vimmode` already supports finite normal-mode edit commands through semantic key descriptors, pure prompt-buffer helpers, and the modal normal-mode dispatcher. `x` maps to `deleteChar` and deletes characters under/after the cursor; `X` is currently unmapped even though it is the natural backwards-delete pair.

## Goals / Non-Goals

**Goals:**

- Add `X` as a finite normal-mode command that deletes before the cursor.
- Preserve count, unnamed character register, dot-repeat, pending-register, and safe no-op behavior consistent with other delete commands.
- Keep implementation inside existing command parser, buffer helper, and modal normal-mode seams.
- Document the new key in `docs/features.md`.

**Non-Goals:**

- No new configurable keymap family beyond the existing command descriptor entry.
- No visual-mode or operator-motion semantics for uppercase `X`.
- No Vim parity claim beyond this command.

## Decisions

### Decision: Add a semantic `deleteCharBefore` command

Target seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/commands.ts` compiled command handling.

Add a `VimCommandAction` named `deleteCharBefore` with default key `X`. This follows the existing semantic command model instead of adding raw-key branches in modal code.

Alternatives considered:

- Hard-code `X` in modal dispatch: rejected because it bypasses descriptor-driven parser/default-key documentation paths.
- Model as `delete` + `h` operator motion: rejected because `X` is a direct command with its own register/cursor behavior and should not expose new operator grammar.

### Decision: Put backwards deletion in `src/buffer.ts`

Target seam: `src/buffer.ts`.

Add a pure helper such as `deleteCharBefore(text, cursor, count)` that clamps the cursor, deletes up to `count` characters to the left within the current line, returns a characterwise register, and places the cursor at the deletion start. At column `0`, it returns a safe no-op.

Alternatives considered:

- Compose `deleteRange` directly in `src/modal/normal.ts`: rejected because range math belongs in buffer operation helpers.
- Reuse `deleteCharAt` by moving the cursor left first: rejected because count and cursor placement are clearer in one backwards-delete operation.

### Decision: Treat `deleteCharBefore` like other delete-style commands

Target seam: `src/modal/normal.ts`.

Handle the command alongside `deleteChar`: it is register-aware, writes the unnamed character register when changed, records dot-repeat when changed, and leaves mode normal.

Side effects:

- Registers: unnamed character register receives removed text on changed deletes.
- Marks/search/visual/Ex messages: unchanged.
- Dot-repeat: records `{ type: "command", command: "deleteCharBefore", count }` when changed.
- Cursor: moves to deletion start; no-op at line start keeps clamped cursor.
- Pi delegation: none; command is extension-owned in normal mode.

Alternatives considered:

- Skip dot-repeat for `X`: rejected because `x` participates in repeatable command flow.
- Delete across previous line at column `0`: rejected; prompt-local single-line semantics keep the command small and safe.

## Risks / Trade-offs

- Off-by-one backwards range math → mitigate with focused unit tests for middle, end, count, and column-zero cases.
- Key collision with `Ctrl+X` decrement → mitigate by using descriptor default `X` only; existing textual `ctrl+x` remains separate.
- Docs drift → mitigate by updating `docs/features.md` and running OpenSpec validation.

## Migration Plan

1. Add `deleteCharBefore` type and descriptor entry.
2. Add pure buffer helper and tests.
3. Wire modal normal-command handling and repeat/register tests.
4. Update user-facing feature docs.
5. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback: remove descriptor/type/helper/modal handling and docs entry; no data migration required.

## Open Questions

None.
