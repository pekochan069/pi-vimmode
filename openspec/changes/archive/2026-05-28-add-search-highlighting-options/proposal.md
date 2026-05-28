## Why

Prompt-local `/` search now moves between matches, but users cannot keep search matches visible the way Vim users expect from `hlsearch`. Highlighting search results makes repeated navigation easier and keeps current-match context visible without changing prompt text.

## What Changes

- Add `piVimMode.search` options for search highlighting behavior.
- Highlight all literal prompt-local matches after a successful search when enabled.
- Highlight the current match separately from other search matches.
- Keep highlights width-safe and bounded for large prompts.
- Clear highlights on configurable mode transitions/cancellation.
- Document supported options and out-of-scope Vim parity.

## Capabilities

### New Capabilities

### Modified Capabilities

- `vim-ui-configuration`: Add configurable prompt search highlighting and related UI behavior.
- `extended-vim-keybindings`: Extend prompt search behavior so successful `/`, `n`, and `N` update visible search highlights.

## Impact

- Affected code: `src/config.ts`, `src/types.ts`, `src/modal/*`, `src/buffer.ts`, render helpers, `VimEditor` integration.
- Affected tests: config, buffer/render, modal, editor integration.
- Affected docs: README and change tasks.
- No new runtime dependencies.
