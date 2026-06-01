---
title: Pi vimmode finite Ex line commands architecture
date: 2026-06-01
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding finite Ex command-line commands without implementing full Vimscript"
  - "Extending a substitution-only Ex parser into a discriminated command union"
  - "Keeping prompt-buffer line edits in buffer helpers instead of modal dispatch"
  - "Documenting command aliases, side effects, ranges, destinations, and deferred Vim parity"
related_components:
  - development_workflow
  - testing_framework
  - documentation
tags:
  - pi-vimmode
  - ex-command-line
  - finite-parser
  - prompt-buffer
  - line-commands
  - registers
  - search-highlighting
  - openspec
---

# Pi vimmode finite Ex line commands architecture

## Context

`pi-vimmode` already had prompt-local Ex command-line mode for literal substitution, but common Vim-fluent line commands still returned unsupported-command errors. The `add-more-ex-commands` OpenSpec change expanded that surface to a finite command set: `:delete`/`:d`, `:yank`/`:y`, `:put`/`:pu`, `:copy`/`:t`, `:move`/`:m`, `:join`/`:j`, and `:nohlsearch`/`:noh`.

The reusable architecture problem was bigger than adding aliases. Ex line commands cross the parser, range handling, destination addresses, pure prompt-buffer transforms, unnamed register semantics, visible search highlights, transient Ex messages, macro replay, dot-repeat boundaries, docs, and tests. Prior session history also reinforced the same direction: keep parser/buffer/modal logic in pure modules and keep `VimEditor` as a thin Pi `CustomEditor` adapter (session history).

## Guidance

Use a finite typed Ex-command architecture rather than broad Vimscript parsing.

1. **Parse command text into a discriminated union.** `src/ex.ts` should parse the range first, preserve whether the range was explicit, then parse exact command names and aliases. Keep destination parsing separate for `:copy`/`:t` and `:move`/`:m`.

   ```ts
   export function parseExCommand(commandLine: string, context: ExParseContext): ExParseResult {
     const source = commandLine.trim();
     if (source.length === 0) return { type: "empty" };

     const range = parseRange(source, context);
     if (!range.ok) return { type: "error", message: range.message };

     const command = parseCommand(range.rest);
     if (!command.ok) return { type: "error", message: command.message };

     return dispatchFiniteExCommand(command, range);
   }
   ```

2. **Accept only the finite grammar.** Supported command families are:
   - range commands: `delete`, `yank`, `put`, `join`
   - destination commands: `copy`, `move`
   - state-only command: `nohlsearch`

   Reject unsupported abbreviations, missing destinations, invalid destinations, and trailing arguments at parse time. Do not allow familiar Vim syntax to silently imply full Vimscript support.

3. **Treat destination `0` as a destination-only address.** Ex range address `0` remains invalid for commands like `:0delete`, but `:2t0` and `:3move0` use internal destination `-1` to mean “before the first prompt line”. Numeric destinations otherwise map from 1-based Ex addresses to 0-based line indexes.

4. **Keep prompt-buffer edits in `src/buffer.ts`.** Add operation-level helpers such as:
   - `deleteExLineRange`
   - `yankExLineRange`
   - `putExRegisterAfterRange`
   - `copyExLineRange`
   - `moveExLineRange`
   - `joinExLineRange`

   Modal code should not splice prompt text directly. Buffer helpers own line splitting, clamping, destination math, cursor placement, linewise register payloads, and no-op/error cases.

5. **Keep side effects in `src/modal/engine.ts`.** `executeExCommand` is the chokepoint for applying parsed command results:
   - `:delete` writes deleted text to the unnamed linewise register.
   - `:yank` writes addressed lines to the unnamed linewise register without editing text.
   - `:put` reads only the unnamed register and errors when it is empty.
   - text-changing commands clear visible prompt search highlights.
   - `:nohlsearch` clears visible highlights but preserves repeat-search state for `n`/`N`.
   - Ex line commands do not update dot-repeat and do not write named registers.

6. **Lock behavior at three levels.** Use parser tests for grammar, buffer tests for pure line transforms, and editor integration tests for modal side effects. For this change, validation was:
   - `openspec validate add-more-ex-commands --type change --strict`
   - `bun test` (`238 pass`)
   - `bun run check-types`
   - `bun run lint`
   - scoped `oxfmt --check` on changed code and tests

## Why This Matters

Ex commands look small at the prompt, but their side effects are stateful. If parsing, text surgery, register writes, and search-highlight behavior collapse into one modal branch, future commands become hard to reason about and easy to over-scope.

The working shape keeps each concern testable:

- `src/ex.ts` owns syntax and explicit non-goals.
- `src/buffer.ts` owns prompt-buffer invariants.
- `src/modal/engine.ts` owns Vim side effects and UI messages.
- `docs/features.md` and OpenSpec own the public contract.

This also prevents Vim-parity drift. A user can rely on the documented finite commands, while future implementers can see that regex substitution, command history, offsets, semicolon ranges, Ex register operands, `:global`, shell/file/window commands, and Vimscript evaluation remain intentionally out of scope.

## When to Apply

- Adding another bounded prompt-local Ex command.
- Generalizing a parser from one command family to several finite command variants.
- Implementing Vim-like range or destination behavior without full Vim grammar.
- Adding line/range operations whose register, search-highlight, or cursor effects matter.
- Keeping OpenSpec, README, feature docs, and tests synchronized for editor behavior.

Do not use this pattern as-is for broad Ex features that require command history, a regex engine, `:global`, file or shell commands, windows/buffers, or Vimscript evaluation. Those need new scope and architecture decisions.

## Examples

Parser examples:

```vim
:2,4delete
:%y
:put
:2,3copy$
:2t0
:3,4m1
:noh
```

Implementation examples:

```ts
if (parsed.type === "nohlsearch") {
  return invalidate(finishExState(clearSearchHighlight(state)));
}

if (parsed.type === "delete") {
  const result = deleteExLineRange(snapshot.text, parsed.range);
  if (!result.ok) return invalidate(finishExState(state, "error", result.message));
  return finishExEdit(state, result, lineMessage(result.lines, "deleted"), result.edit.register);
}
```

Behavior examples to preserve in tests:

- `:move` rejects a destination inside the moved range.
- `:join` with no explicit range joins current line with the next line.
- `:join` with an explicit range joins all addressed lines and normalizes boundary whitespace.
- `:copy` and `:move` accept destination `0` for insertion before line 1.
- `:nohlsearch` clears highlight rendering while `n`/`N` still repeat the last search.
- Ex edits leave dot-repeat unchanged.

## Related

- `openspec/changes/archive/2026-06-01-add-more-ex-commands/` — source OpenSpec change for this implementation.
- `openspec/specs/vim-ex-command-line/spec.md` — durable requirements for Ex command-line behavior.
- `docs/solutions/architecture-patterns/pi-vimmode-ex-command-line-substitution-architecture-2026-05-28.md` — precursor architecture for substitution-only Ex command-line mode.
- `docs/solutions/architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md` — related operation-level buffer API pattern.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — related finite parser and buffer-helper architecture pattern.
- `docs/solutions/design-patterns/pi-vimmode-search-highlighting-render-precedence-2026-05-28.md` — related search-highlight side-effect guidance; stale `:nohlsearch` caveats should be refreshed.
