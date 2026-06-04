## Why

Search and Ex command-line currently use separate minimal collectors, so users lose history, backward search, query recall, and safe preview before prompt-wide edits. The next roadmap item should deepen them into one bounded workbench without drifting into full Vimscript or unbounded regex behavior.

## What Changes

- Replace the separate `/` search and `:` Ex collectors with a shared prompt-local workbench mini-editor for query/command entry.
- Add backward `?` search with repeat-search semantics that respect original search direction.
- Add history navigation for completed search queries and Ex commands, including previous-query recall for empty `/` or `?` search.
- Add explicit literal and bounded-regex modes for search and substitution, with invalid or expensive patterns rejected safely.
- Add substitution match highlighting and count feedback before edit execution, so broad replacements can be inspected before mutating prompt text.
- Keep all behavior finite, prompt-local, and safe on invalid/missing targets.

### Non-goals

- No full Vimscript, recursive mappings, `.vimrc`, command abbreviations beyond current finite Ex command set, or full Vim search grammar.
- No cross-prompt persistent history unless explicitly added later.
- No interactive `:s///c` per-match confirmation loop in this change.
- No unbounded regex engine behavior, async workers, or new runtime dependencies.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-search`: add backward `?`, shared workbench editing/history, previous-query recall, and safe literal/regex query modes.
- `vim-ex-command-line`: add shared workbench editing/history plus bounded substitution regex/literal modes and match preview/count feedback.
- `vim-keymap-configuration`: expose backward search entry as a finite semantic command while keeping workbench history controls prompt-local and non-recursive.
- `vim-ui-configuration`: ensure shared workbench rows, search highlights, and substitution match preview/count messages render width-safely with existing prompt/status UI.

## Impact

- Code seams: `src/modal/types.ts`, `src/modal/engine.ts`, `src/ex.ts`, `src/buffer.ts`, `src/commands.ts`, `src/config.ts`, `src/types.ts`, `src/render.ts`, `src/vim-editor.ts`, and likely a new pure workbench helper module.
- Tests: focused parser/workbench unit tests, buffer search/substitution tests, modal search/Ex interaction tests, config/keymap tests, render width-safety tests, and live `VimEditor` integration tests.
- Docs: update `docs/features.md`, `docs/settings.md`, and `TODOS.md` after validation.
- Dependencies: no new runtime or peer dependencies expected.
- Compatibility: no breaking changes; insert mode stays Pi-owned, existing `/`, `:`, `n`, `N`, and Ex commands keep current behavior unless users opt into new regex mode during a workbench entry.
