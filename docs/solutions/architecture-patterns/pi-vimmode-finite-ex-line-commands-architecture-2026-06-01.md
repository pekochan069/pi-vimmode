---
title: Pi vimmode finite Ex line commands architecture
date: 2026-06-01
last_updated: 2026-06-05
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
  - "Completing stale Ex TODOs while keeping docs, runtime help, OpenSpec specs, and drift guards synchronized"
related_components:
  - development_workflow
  - testing_framework
  - documentation
tags:
  - pi-vimmode
  - ex-command-line
  - finite-parser
  - range-algebra
  - registers
  - substitution
  - docs-drift
  - openspec
---

# Pi vimmode finite Ex line commands architecture

## Context

`pi-vimmode` already had prompt-local Ex command-line mode for literal substitution, but common Vim-fluent line commands still returned unsupported-command errors. The `add-more-ex-commands` OpenSpec change expanded that surface to a finite command set: `:delete`/`:d`, `:yank`/`:y`, `:put`/`:pu`, `:copy`/`:t`, `:move`/`:m`, `:join`/`:j`, and `:nohlsearch`/`:noh`.

The reusable architecture problem was bigger than adding aliases. Ex line commands cross the parser, range handling, destination addresses, pure prompt-buffer transforms, unnamed and named register semantics, visible search highlights, transient Ex messages, macro replay, dot-repeat boundaries, docs, and tests. Later range-algebra and TODO-completion work extended the same architecture: finite Ex address/range/destination parsing now lives in a pure `src/range.ts` kernel; repeat substitution, safe substitution flags, Ex register operands, and command-line editing live behind focused parser/modal helpers; `src/ex.ts`, `src/buffer.ts`, and modal helpers stay responsible for syntax dispatch, prompt-buffer operations, and editor side effects respectively.

## Guidance

Use a finite typed Ex-command architecture rather than broad Vimscript parsing.

1. **Parse command text into a discriminated union.** `src/ex.ts` should parse the range first, preserve whether the range was explicit, then parse exact command names and aliases. Keep destination parsing separate for `:copy`/`:t` and `:move`/`:m`.

   ```ts
   export function parseExCommand(commandLine: string, context: ExParseContext): ExParseResult {
     const source = commandLine.trim();
     if (source.length === 0) return { type: "empty" };

     const range = parseExLineRange(source, context);
     if (!range.ok) return { type: "error", message: range.error.message };

     const repeat = range.value.rest.trim();
     if (repeat === "&" || repeat === "&&") {
       return {
         type: "repeatSubstitute",
         command: repeat,
         range: range.value.range,
         rangeExplicit: range.value.explicit,
       };
     }

     const command = parseCommand(range.value.rest, context);
     if (!command.ok) return { type: "error", message: command.message };

     // Switch on command.command.type and return the finite parsed result.
   }
   ```

2. **Accept only the finite grammar.** Supported line-command families are:
   - range commands: `delete`, `yank`, `put`, `join`, substitution, and prompt transforms
   - destination commands: `copy`, `move`
   - state-only commands: `nohlsearch` and read-only diagnostics

   Reject unsupported abbreviations, missing destinations, invalid destinations, and trailing arguments at parse time. Do not allow familiar Vim syntax to silently imply full Vimscript support.

3. **Treat destination `0` as a destination-only address.** Ex range address `0` remains invalid for commands like `:0delete`, but `:2t0` and `:3move0` use internal destination `-1` to mean “before the first prompt line”. Numeric destinations otherwise map from 1-based Ex addresses to 0-based line indexes. Destination offsets are valid for normal destinations, but `0+1` stays invalid because destination `0` is a special insertion point, not a real line address.

4. **Centralize finite range algebra before adding more address grammar.** When Ex commands need offsets or base-sensitive ranges, put the parse/resolve logic in `src/range.ts` rather than adding more branches to modal command dispatch. The supported finite grammar includes current/last/numeric addresses, `%`, visual `'<,'>` capture, one signed offset such as `.+1` or `$-2`, comma ranges, and semicolon ranges where the second address resolves with the first address as current line.

   ```vim
   :.+1delete
   :$-2,$yank
   :3+2move 0
   :3;.+2copy $
   :'<,'>delete
   ```

   Reject repeated offsets like `3+1-2`, missing addresses around separators, reversed ranges, and broad Vim syntax that the finite parser does not explicitly support. Parse and resolve first; mutate prompt text only after the typed range or destination is valid.

5. **Keep prompt-buffer edits in `src/buffer.ts`.** Add operation-level helpers such as:
   - `deleteExLineRange`
   - `yankExLineRange`
   - `putExRegisterAfterRange`
   - `copyExLineRange`
   - `moveExLineRange`
   - `joinExLineRange`

   Modal code should not splice prompt text directly. Buffer helpers own line splitting, clamping, destination math, cursor placement, linewise register payloads, and no-op/error cases.

6. **Keep Ex input behavior out of the main modal dispatcher.** `src/modal/ex-command-line.ts` owns pending Ex input editing, history navigation, preview/apply state, and repeat-substitution source updates. Keep helpers bounded: cursor-aware edits can support navigation/deletion/word deletion without embedding the full prompt editor inside Ex input.

7. **Keep side effects in modal Ex execution helpers.** Ex execution is the chokepoint for applying parsed command results:
   - `:delete` writes deleted text to the unnamed linewise register, and `:delete a` / `:delete A` also write or append named register `a`.
   - `:yank` writes addressed lines to the unnamed linewise register, and `:yank a` / `:yank A` also write or append named register `a` without editing text.
   - `:put` reads the unnamed register by default; `:put a` and `:put A` read lowercase named register `a` and error when the target register is empty.
   - substitution `n` counts matches without mutating prompt text, `e` suppresses no-match errors, and `:&` / `:&&` repeat the last successfully applied substitution through the preview/apply flow.
   - text-changing commands clear visible prompt search highlights.
   - `:nohlsearch` clears visible highlights but preserves repeat-search state for `n`/`N`.
   - Ex line commands do not update dot-repeat.

8. **Lock behavior at three levels.** Use parser tests for grammar, buffer tests for pure line transforms, and editor integration tests for modal side effects. For range algebra and Ex TODO completion, validation covered `test/range.test.ts`, `test/ex.test.ts`, `test/buffer.test.ts`, `test/modal.test.ts`, `test/vim-editor.test.ts`, config tests, and docs-drift tests for offset/semicolon preview/apply, invalid range safety, destination `0`, named-register writes/appends/reads, repeat substitution, count/no-error flags, workbench row reservation, search-highlight behavior, and dot-repeat preservation. Keep the durable validation checklist small: OpenSpec validation, Bun tests, typecheck, lint, and formatter.

## Why This Matters

Ex commands look small at the prompt, but their side effects are stateful. If parsing, text surgery, register writes, and search-highlight behavior collapse into one modal branch, future commands become hard to reason about and easy to over-scope.

The working shape keeps each concern testable:

- `src/ex.ts` owns syntax and explicit non-goals.
- `src/buffer.ts` owns prompt-buffer invariants.
- Modal Ex helpers own command-line lifecycle, preview/apply state, register side effects, and UI messages; `src/modal/engine.ts` stays the router rather than the sink for every Ex branch.
- `docs/features.md` and OpenSpec own the public contract.

This also prevents Vim-parity drift. A user can rely on the documented finite commands, finite range grammar, finite substitution flags, repeat-substitution flow, and supported lowercase/uppercase register operands. Future implementers can see that quoted/special register operands, `:global`, shell/file/window commands, arbitrary expressions, repeated offsets, confirmation/print substitution flags, replacement backrefs, and Vimscript evaluation remain intentionally out of scope.

## When to Apply

- Adding another bounded prompt-local Ex command.
- Generalizing a parser from one command family to several finite command variants.
- Implementing Vim-like range, offset, semicolon, or destination behavior without full Vim grammar.
- Adding line/range operations whose register, search-highlight, cursor, or preview effects matter.
- Keeping OpenSpec, README, feature docs, runtime help, and drift tests synchronized for editor behavior.

Do not use this pattern as-is for broad Ex features that require full Vim command-line editing, `:global`, file or shell commands, windows/buffers, Vimscript evaluation, replacement backrefs, confirmation prompts, or print/list flags. Those need new scope and architecture decisions.

## Examples

Parser examples:

```vim
:2,4delete
:%y
:put
:2,3copy$
:2t0
:3,4m1
:.+1delete
:$-2,$yank
:3;.+2copy $
:%s/foo/bar/gn
:%s/foo/bar/ge
:%&
:delete a
:yank A
:put a
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
  const base = parsed.register ? { ...state, pendingRegister: parsed.register } : state;
  const next = writeRegisters(base, result.edit.register);
  return finishExEdit(next, result, lineMessage(result.lines, "deleted"));
}
```

Behavior examples to preserve in tests:

- `:.+1s/foo/bar/` previews and applies on the line after the cursor.
- `:3;.+2d` resolves the second address relative to line 3.
- `:3+1-2d` is rejected instead of interpreted as a chained offset.
- `:0+1t.` is rejected because destination `0` cannot take offsets.
- Invalid ranges leave prompt text, registers, Ex history, preview state, and cursor behavior unchanged.
- `:move` rejects a destination inside the moved range.
- `:join` with no explicit range joins current line with the next line.
- `:join` with an explicit range joins all addressed lines and normalizes boundary whitespace.
- `:copy` and `:move` accept destination `0` for insertion before line 1.
- `:%s/foo/bar/gn` reports the match count, records successful history, and does not update the repeat-substitution source.
- `:%s/foo/bar/ge` reports `0 substitutions` instead of an error when there are no matches.
- `:&` and `:%&` preview the last successfully applied substitution before mutating text.
- `:delete a` writes deleted linewise text to named register `a` and the unnamed register.
- `:yank A` appends addressed linewise text to named register `a` and writes the latest text to the unnamed register.
- `:put A` reads lowercase register `a`; uppercase put is read-only and does not append.
- `:nohlsearch` clears highlight rendering while `n`/`N` still repeat the last search.
- Ex edits leave dot-repeat unchanged.

## Related

- `openspec/changes/prompt-range-algebra-kernel/` — follow-up OpenSpec change that extracted finite Ex range algebra into `src/range.ts`.
- `openspec/specs/vim-ex-command-line/spec.md` — durable requirements for Ex command-line behavior.
- `docs/solutions/architecture-patterns/pi-vimmode-ex-command-line-substitution-architecture-2026-05-28.md` — precursor substitution architecture; now historical in places because regex mode, history, offsets, `:noh`, `n`/`e`, and repeat substitution have since shipped.
- `docs/solutions/ui-bugs/ex-substitution-match-preview-highlighting-2026-06-04.md` — substitution preview/workbench UX that repeat substitution continues to use.
- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md` — runtime help and docs-drift guard pattern for keeping Ex/settings claims source-backed.
- `docs/solutions/architecture-patterns/pi-vimmode-modal-feature-module-extraction-pattern-2026-06-05.md` — modal module boundary pattern used by `src/modal/ex-command-line.ts`.
- Refresh candidates from this update: substitution-v1 docs, UI config source-of-truth docs, and search-highlighting render-precedence docs.
