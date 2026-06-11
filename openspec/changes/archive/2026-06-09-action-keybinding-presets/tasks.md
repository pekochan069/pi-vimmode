## 1. Recipe Metadata

- [x] 1.1 Decide whether recipe metadata belongs in `src/action-keybinding-recipes.ts` or inside `src/runtime-help.ts` based on final implementation size.
- [x] 1.2 Define source-backed recipe entries for paragraph editing (`gq`, `g>`, `g<`) using canonical `prompt.transform.*` action IDs.
- [x] 1.3 Define source-backed Markdown wrapping recipe entries for fence, quote, and unquote using existing action binding shapes.
- [x] 1.4 If compact prompt cleanup is included, ensure it uses only existing transform actions and does not imply new transform semantics.

## 2. Runtime Discovery

- [x] 2.1 Extend runtime feature/help discovery so `:features keybindings` or equivalent action-keybinding recipe queries find the curated recipes.
- [x] 2.2 Keep runtime output compact, source-backed, and explicit that recipes are opt-in snippets rather than defaults or plugin API.
- [x] 2.3 Preserve existing finite no-match behavior for unsupported mapping/plugin/recipe queries.

## 3. Tests

- [x] 3.1 Add config tests that resolve every recipe snippet through `resolveVimOptions` with no warnings and expected accepted action IDs/keys.
- [x] 3.2 Add or update runtime-help tests for keybinding recipe queries, including action IDs, key sequences, and opt-in wording.
- [x] 3.3 Extend docs-drift tests so recipe docs anchors, recipe action IDs, and recipe test anchors stay aligned with source-backed metadata.
- [x] 3.4 Add regression assertion that default options still accept no `piVimMode.keymap.actions` bindings.
- [x] 3.5 Verify recipe validation preserves existing rejection rules for disabled transforms or protected/conflicting keys through existing config tests or a focused new case.

## 4. Documentation

- [x] 4.1 Add copy-pasteable recipe snippets to `docs/settings.md` near `piVimMode.keymap.actions`.
- [x] 4.2 Add discoverability guidance to `docs/features.md`, including how to find recipes via runtime help.
- [x] 4.3 Ensure docs explicitly state no default keybindings, no plugin API, no diagnostic/help action dispatch, and canonical `prompt.transform.*` IDs only.
- [x] 4.4 Keep README unchanged unless a docs index link is needed; do not duplicate full behavior reference there.

## 5. Validation

- [x] 5.1 Run `bun test test/config.test.ts`.
- [x] 5.2 Run `bun test test/runtime-help.test.ts`.
- [x] 5.3 Run `bun test test/docs-drift.test.ts`.
- [x] 5.4 Run `bun test`.
- [x] 5.5 Run `bun run check-types`.
- [x] 5.6 Run `bun run lint`.
- [x] 5.7 Run `bun run format:check`.
- [x] 5.8 Run `openspec validate action-keybinding-presets --strict`.
- [x] 5.9 Run `openspec validate --specs --strict`.
