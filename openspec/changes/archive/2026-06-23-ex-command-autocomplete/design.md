## Context

pi-vimmode already owns a finite Ex command-line mode in `src/modal/ex-command-line.ts`, with parsing in `src/ex.ts` and workbench rendering in `src/vim-editor.ts`. Supported Ex commands are intentionally explicit: line commands, substitutions, diagnostics/help popups, prompt transforms, `:nohlsearch`, line jumps, and Pi quit. Users currently discover that surface only through docs/runtime help or by trying commands and seeing unsupported-command errors.

This change should make the finite command surface visible while typing `:`. It is command discovery and small completion, not a Neovim-compatible completion engine.

## Goals / Non-Goals

**Goals:**

- Show bounded, width-safe Ex command suggestions while Ex command-line input is active.
- Filter suggestions by the command word after any valid Ex range prefix.
- Source suggestions from the same finite command list that parsing accepts, including enabled prompt transform commands and configured transform aliases.
- Preserve existing Ex behavior: `Enter` executes, substitution preview still uses the Ex row, Up/Down navigate Ex history, Escape cancels, and unsupported commands still fail explicitly.
- Keep Pi-owned insert autocomplete rows intact when host autocomplete is open.
- Cover parser/helper, modal, render, docs, and OpenSpec validation.

**Non-Goals:**

- No full Vimscript, `wildmenu`, completion selection state, cycling menu, file/path/shell completion, command arguments completion, range completion, register completion, or runtime `:command` support.
- No arbitrary command abbreviation expansion beyond already-supported exact aliases.
- No new dependencies.
- No new settings unless implementation discovers one tiny display/keybinding toggle is unavoidable.

## Decisions

1. Add a suggestion helper beside the Ex parser.
   - Seams: `src/ex.ts`, `test/ex.test.ts`.
   - Approach: extract the supported command source into reusable data and export a helper such as `suggestExCommands(commandLine, context)`. It should parse the range prefix with existing range parsing, inspect only the first command word, and return exact supported names that start with the typed prefix.
   - Transform commands: build candidates from enabled prompt transforms and configured `piVimMode.promptTransforms.commands`, using the same enable/disable rules as `parseExCommand`.
   - Alternatives rejected:
     - Duplicate command names in modal rendering: parser and UI drift.
     - Infer suggestions from docs/runtime help: wrong source of truth and too text-heavy.
     - Accept Vim-style abbreviations during completion: widens grammar beyond current parser contract.

2. Render suggestions as extra workbench rows, not as host autocomplete.
   - Seams: `src/modal/types.ts`, `src/vim-editor.ts`, `src/modal/view.ts` if a pure view helper is useful.
   - Approach: compute suggestion text from `pendingEx.command`, command cursor, and resolved options; append one or more bounded suggestion rows after the Ex input row using existing width-fitting/truncation helpers. Keep row count small and subtract it from prompt viewport height like existing workbench rows.
   - Alternatives rejected:
     - Use Pi `CustomEditor` autocomplete: Ex command-line mode is modal state outside insert text, and host autocomplete owns insert-mode suggestions.
     - Use read-only popup/overlay: too heavy for always-on command hints and would steal focus semantics.
     - Replace the Ex input row with suggestions: would hide the active command text and conflict with substitution preview messages.

3. Keep completion application stateless and minimal.
   - Seams: `src/modal/ex-command-line.ts`, modal tests.
   - Approach: `Tab` should complete the command word only when suggestions have a useful common prefix or a single exact candidate. It should update `pendingEx.command` at the command cursor and clear any substitution preview. If there is no improvement, it is a safe no-op. Up/Down remain history navigation; Enter remains execution.
   - Alternatives rejected:
     - Menu selection index in `PendingExCommand`: more state and keyboard conflicts for little value.
     - Tab cycling through all candidates: requires selection state and creates surprising command changes.
     - Auto-insert first candidate while typing: risks changing commands before explicit user action.

4. Preserve existing side effects.
   - Seams: `src/modal/ex-command-line.ts`, `src/vim-editor.ts`, tests.
   - Approach: showing suggestions must not edit prompt text, registers, marks, macros, search state, dot-repeat, visual selection, cursor placement, Ex history, or Pi application state. Applying a suggestion changes only pending Ex command text/cursor and clears stale preview state.
   - Alternatives rejected:
     - Record completed suggestions in Ex history before execution: history should contain executed successful Ex commands only.
     - Treat suggestion display as an Ex message: messages are transient command results; suggestions are active input UI.

5. Document finite scope with the existing Ex docs.
   - Seams: `docs/features.md`, docs drift tests if touched.
   - Approach: mention command suggestions near Ex command-line behavior and state that only supported exact commands and enabled transform aliases are suggested.
   - Alternatives rejected:
     - New README section: README is quickstart/index only.
     - Full command reference rewrite: unrelated to this change.

## Risks / Trade-offs

- Suggestion candidates drift from parser support → share candidate data/helper in `src/ex.ts` and test disabled/enabled transform cases.
- Workbench rows crowd small terminals → bound suggestion rows, fit width, and subtract rows from prompt viewport like existing search/Ex rows.
- Host autocomplete rows regress → add live `VimEditor.render` tests with host autocomplete open, as previous row-overlap bug showed this seam is fragile.
- Cursor-in-middle edits complete the wrong text → use `pendingEx.cursor` and tests for prefix insertion at the command word, not always end-of-line.
- Transform aliases are config-sensitive → use resolved prompt transform options and include custom alias tests.
- `Tab` may conflict with future command argument completion → keep v1 command-word-only and no-op after whitespace/arguments.

## Migration Plan

1. Extract finite Ex command candidate source and add suggestion/helper tests.
2. Extend Ex pending input handling for command-word suggestion display and minimal `Tab` completion.
3. Render bounded suggestion rows below the Ex input row without stealing Pi autocomplete rows.
4. Add modal/live render tests for filtering, completion, visual-source Ex, history/substitution preservation, and configured transform commands.
5. Update `docs/features.md` and any runtime help/drift tests that enumerate Ex command-line behavior.
6. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback: remove the suggestion helper/rendering/Tab handling/docs. Existing Ex parsing and execution remain unchanged.

## Open Questions

None.
