## Context

`/`, `n`, and `N` already resolve prompt-local literal search targets and store last search state. Rendering currently only has explicit custom highlighting for visual selections; normal/insert rendering delegates to Pi's editor render and only restyles the cursor marker. Search highlighting needs to compose with both normal and visual rendering without changing prompt text or delegated Pi shortcuts.

## Goals / Non-Goals

**Goals:**
- Add parsed, validated `piVimMode.search` options with safe defaults.
- Render search matches after successful searches when highlighting is enabled.
- Render the active match distinctly from other matches.
- Clear highlights according to explicit options without clearing last repeatable search state unless existing semantics do so.
- Keep rendering width-safe and bounded by `maxHighlights`.

**Non-Goals:**
- Vim highlight group compatibility, custom color schemes, `:nohlsearch`, regex search, `?`, search history, or cross-prompt search.
- Highlighting overlapping matches beyond deterministic left-to-right non-overlapping literal matches.
- New external dependencies.

## Decisions

1. Store search-highlight state in modal state, not editor adapter state.
   - Rationale: modal search already owns query/current match/last-search semantics, so effects remain deterministic and testable through modal/editor integration.
   - Alternative rejected: derive highlights from `lastSearch` only in render. This cannot distinguish cleared highlight state from repeatable last search state.

2. Render highlights through the local render helper for both visual and non-visual modes.
   - Rationale: search highlights need width-safe composition with cursor and visual selection. A single renderer avoids ANSI post-processing of Pi-rendered output.
   - Alternative rejected: regex post-process `super.render()` output. ANSI cursor markers and wrapping make this brittle.

3. Use fixed ANSI styles for now.
   - Rationale: options requested are behavior options, not full theme APIs. Fixed search/current styles keep scope small and testable.
   - Alternative deferred: `piVimMode.ui.highlights` style names or theme integration.

4. Clear highlights on configurable modal events.
   - Defaults: `highlight=true`, `highlightCurrent=true`, `clearOnCancel=true`, `clearOnInsert=true`, `maxHighlights=200`.
   - Rationale: close to Vim's helpful `hlsearch` behavior while avoiding stale highlights during editing.

## Risks / Trade-offs

- [Risk] Replacing normal render path could diverge from Pi editor rendering. → Mitigation: reuse existing visual renderer layout primitives and add integration tests for normal rendering/search status/cursor.
- [Risk] Large prompt highlight scans could be expensive. → Mitigation: cap rendered ranges with `maxHighlights` and scan only current prompt lines.
- [Risk] Visual selection and search highlight overlap can create unreadable ANSI nesting. → Mitigation: define precedence: cursor > visual selection > current search > other search.
