---
title: Pi vimmode keybinding discovery help topic boundary
date: 2026-06-09
category: docs/solutions/documentation-gaps
module: pi-vimmode runtime help
problem_type: documentation_gap
component: documentation
severity: low
applies_when:
  - "Writing manual smoke tests for pi-vimmode runtime help or keybinding discovery"
  - "Explaining why `:help keybindings` returns no match"
  - "Adding or reviewing docs for read-only Ex help popups"
related_components:
  - tooling
  - testing_framework
  - development_workflow
tags:
  - pi-vimmode
  - runtime-help
  - keybindings
  - ex-command-line
  - manual-testing
  - docs-drift
---

# Pi vimmode keybinding discovery help topic boundary

## Context

While validating the read-only Ex output popup change, the manual smoke-test guidance included `:help keybindings`. That command returned `help: no match for keybindings`, which looked suspicious until the source-backed runtime help boundaries were checked.

The behavior is correct: `keybindings` is not a `:help` topic. Keybinding discovery is intentionally exposed through `:features keybindings`.

Session history search was requested, but this checkout does not include the `scripts/discover-sessions.sh` / extraction pipeline required by `/ce-sessions`, so no prior-session findings were incorporated.

## Guidance

Use `:features keybindings` when manually testing the keybinding discovery popup.

Related commands:

```vim
:features keybindings
:features action keybindings
:help actions
:help settings
```

Do not treat this output as a failure:

```vim
:help keybindings
" help: no match for keybindings
```

The source boundary is explicit:

- `src/runtime-help.ts` resolves `:help <topic>` against finite runtime help entries and diagnostic action metadata. When no entry matches, it returns `help: no match for ${query}`.
- `src/keybinding-discovery-popup.ts` routes the keybinding popup only when the command is `features` and the query is `keybindings`.
- `docs/features.md` documents `:features keybindings` as the keybinding discovery entry point.

If users repeatedly expect `:help keybindings` to work, consider adding an explicit alias in `runtimeHelpMessage()` or documenting the boundary more prominently. Until then, manual test instructions should use the supported command rather than widening runtime help semantics accidentally.

## Why This Matters

The runtime help system is deliberately finite. Familiar Vim command names should not imply full Vim help tags, a pager, Vimscript, or arbitrary tag lookup. Keeping `:help` and `:features` distinct preserves that product boundary:

- `:help` explains broad runtime topics such as search, Ex commands, settings, diagnostics, marks, and macros.
- `:features` answers narrower feature-discovery questions, including source-backed action keybinding recipes and effective option state.

Incorrect smoke-test instructions create false negatives: a correct `help: no match` response can look like a popup regression. That wastes debugging time and may push the implementation toward accidental Vim parity instead of the intended finite discovery surface.

## When to Apply

- Writing manual QA steps for read-only Ex popup behavior.
- Reviewing docs that mention keybinding discovery or runtime help.
- Debugging `help: no match for keybindings` during pi-vimmode validation.
- Deciding whether a new discoverability query belongs under `:help` or `:features`.

## Examples

Correct manual smoke test:

```vim
:features keybindings
```

Expected result: read-only popup overlay titled around keybinding discovery, with bounded source-backed rows and local close/scroll controls.

Incorrect manual smoke test:

```vim
:help keybindings
```

Expected result under current semantics: compact no-match feedback, not a popup.

A safe validation checklist for this area:

```bash
bun test test/runtime-help.test.ts test/modal.test.ts test/vim-editor.test.ts test/docs-drift.test.ts
bun run check-types
bun run lint
bun run format:check
```

## Related

- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md` — finite runtime help registry and docs/spec/test drift guards.
- `docs/solutions/design-patterns/pi-vimmode-read-only-help-overlay-ui-2026-06-09.md` — read-only popup overlay pattern for `:features keybindings` and related commands.
- `docs/solutions/developer-experience/action-keybinding-recipes-for-pivimmode-2026-06-09.md` — action keybinding recipes surfaced through `:features keybindings`.
- `docs/features.md` — user-facing runtime discovery and popup behavior documentation.
