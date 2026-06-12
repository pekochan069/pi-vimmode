## Why

Legacy `promptTransform.*` diagnostic aliases were intentionally temporary during the canonical action ID transition. Removing them now reduces duplicate naming paths, keeps diagnostics aligned with `prompt.transform.*`, and eliminates compatibility code that can make keybinding/help output harder to reason about.

## What Changes

- **BREAKING** Remove all runtime diagnostic/search support for legacy `promptTransform.*` action aliases.
- Require canonical `prompt.transform.*` IDs everywhere action IDs are surfaced or queried.
- Simplify prompt transform action metadata by dropping legacy alias generation and lookup helpers.
- Update runtime diagnostics, feature discovery, keybinding popup output, docs drift guard, and tests to reject or ignore legacy alias expectations.
- Keep `piVimMode.promptTransforms.*` settings unchanged; those settings configure transform enablement and Ex command names, not action IDs.

## Non-goals

- No new prompt transform actions, text edit semantics, or default keybindings.
- No runtime `:map`, `:action`, plugin API, recursive mappings, Vimscript, or Neovim parity expansion.
- No rename of canonical `prompt.transform.*` IDs.
- No removal of `piVimMode.promptTransforms.actions` or `piVimMode.promptTransforms.commands` settings.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `prompt-transform-action-keybindings`: legacy `promptTransform.*` aliases are no longer searchable diagnostics and canonical `prompt.transform.*` IDs are the only action IDs.
- `vim-keymap-configuration`: `piVimMode.keymap.actions` keeps rejecting non-canonical IDs, but no longer treats `promptTransform.*` as a special transition alias with canonical suggestion behavior.
- `vim-customization-diagnostics`: `:actions`, `:keymap`, `:mapcheck`, keybinding catalog, and popup diagnostics stop listing or matching legacy aliases.
- `runtime-help-drift-guard`: drift guard no longer requires docs/tests to preserve legacy alias transition coverage and instead prevents stale legacy alias claims.
- `pi-vimmode-documentation`: user-facing docs remove transition language and state canonical `prompt.transform.*` IDs only.

## Impact

- Code seams: `src/prompt-transform-actions.ts`, `src/config.ts`, `src/customization.ts`, `src/runtime-help.ts`, `src/keybinding-discovery-popup.ts` if popup/help copy references aliases.
- Tests: update prompt transform registry, config warnings, customization diagnostics, runtime help, docs drift guard, and any popup/keybinding catalog tests that mention `promptTransform.*`.
- Docs/specs: update `docs/features.md`, `docs/settings.md`, and OpenSpec deltas for modified capabilities.
- Compatibility: breaking removal for users relying on `:actions promptTransform.reflow` or `:features promptTransform.reflow`; canonical `prompt.transform.reflow` remains supported.
- Dependencies: no new runtime or dev dependencies.
