## Why

Prompt transform action keybindings are powerful but too hard to adopt from registry docs alone. Users need copy-pasteable recipes and runtime discovery so common prompt editing workflows can be configured quickly without inventing their own bindings.

## What Changes

- Add documented action-keybinding recipes for common prompt editing workflows:
  - paragraph editing with `gq`, `g>`, and `g<`
  - Markdown wrapping with fence, quote, and unquote bindings
  - optional compact prompt cleanup recipe if existing transforms support it without new action semantics
- Add runtime feature/help discovery that can show recommended `piVimMode.keymap.actions` snippets, likely through `:features keybindings` or a similarly source-backed query.
- Add drift-guarded docs examples in `docs/settings.md` and/or `docs/features.md` so copy-paste snippets stay parseable.
- Add tests that parse the recipe snippets through config resolution and verify runtime-help output remains aligned with docs/source metadata.
- Keep keybindings opt-in: no default action keybindings are introduced.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `prompt-transform-action-keybindings`: prompt transform action keybinding support gains curated, copy-pasteable recipe snippets that remain opt-in and parseable through config validation.
- `runtime-help-drift-guard`: runtime help/feature discovery and docs drift validation gain source-backed action-keybinding recipe coverage.

## Non-goals

- No default keybindings.
- No user plugin API.
- No generic command palette.
- No diagnostic/help action keybinding dispatch.
- No removal of legacy `promptTransform.*` aliases.

## Impact

- Code seams: likely `src/runtime-help.ts`, `src/config.ts` fixtures/helpers only if needed for reusable snippet parsing, and source-backed action metadata if recipes live there.
- Tests: `test/config.test.ts`, `test/runtime-help.test.ts`, `test/docs-drift.test.ts`, plus full suite validation.
- Docs: `docs/settings.md` and/or `docs/features.md` get recipe snippets and discoverability guidance.
- Specs: delta specs for `prompt-transform-action-keybindings` and `runtime-help-drift-guard`.
- Dependencies: no new runtime dependencies or peer dependency changes.
- Compatibility: non-breaking; existing configs, action IDs, aliases, and prompt transform behavior remain unchanged.
