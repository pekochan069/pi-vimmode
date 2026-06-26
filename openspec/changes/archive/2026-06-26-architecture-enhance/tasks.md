## 1. Baseline and Scope Guard

- [x] 1.1 Read target source and tests for keymap grammar, customization diagnostics, runtime help drift metadata, and visual selection; confirm no workbench deletion is included.
- [x] 1.2 Check relevant `docs/solutions/` entries before editing parser, buffer, modal, config, or docs-drift code.
- [x] 1.3 Run targeted baseline tests for command/config keymap behavior, prompt transform diagnostics, docs drift, and visual behavior before refactors.

## 2. Keymap Grammar Helpers

- [x] 2.1 Add focused tests proving runtime/config diagnostics share binding enumeration for default and configured keymaps.
- [x] 2.2 Add focused tests for exact conflicts, executable prefix shadows, shared non-executable prefixes, and protected shortcut behavior.
- [x] 2.3 Extract or reuse a small internal helper for resolved keymap binding enumeration and exact/prefix conflict checks.
- [x] 2.4 Rewire `src/commands.ts` and `src/config.ts` to use the shared helper without changing public option types or runtime command results.
- [x] 2.5 Remove now-duplicated grammar/conflict-walk code and run the keymap command/config tests.

## 3. Prompt Transform Registry-Backed Diagnostics

- [x] 3.1 Add focused diagnostics tests showing `:actions`, `:features`, `:keymap`, `:mapcheck`, and `:vimdoctor` use canonical prompt transform registry metadata.
- [x] 3.2 Extend `src/prompt-transform-actions.ts` metadata only for facts diagnostics need and the registry does not already own.
- [x] 3.3 Rewire `src/customization.ts` diagnostics to read prompt transform action IDs, descriptions, args, and enabled/disabled state from the registry.
- [x] 3.4 Remove duplicated prompt transform description tables from diagnostics code and rerun customization diagnostics tests.

## 4. Runtime Help Drift Anchor Co-location

- [x] 4.1 Add or adjust docs-drift tests so missing runtime help docs/spec/test anchors fail from registry-owned metadata.
- [x] 4.2 Add runtime help docs/spec/test anchors or explicit exceptions to `src/runtime-help.ts` entries.
- [x] 4.3 Rewire `test/docs-drift.test.ts` to read runtime help IDs and anchors from the runtime help registry.
- [x] 4.4 Remove duplicated runtime help anchor data from `test/support/runtime-docs-metadata.ts` only after drift tests prove parity.
- [x] 4.5 Run docs drift tests and verify `:help`, `:features`, `:messages`, and keybinding discovery output stay unchanged.

## 5. Visual Selection Seam

- [x] 5.1 Add focused tests that lock current visual range normalization, selected text, visual edit targets, summaries, render mapping, modal operations, and Ex `'<,'>` prefill behavior.
- [x] 5.2 Extract pure visual-selection helpers for range normalization, selected text, edit targets, and summaries.
- [x] 5.3 Rewire `src/buffer.ts`, `src/modal/visual.ts`, `src/range.ts`, renderer callers, and `src/modal/ex-command-line.ts` to use the visual-selection seam.
- [x] 5.4 Keep compatibility wrappers only where they reduce churn; delete duplicated visual-selection logic once callers use the seam.
- [x] 5.5 Verify visual side effects remain unchanged for registers, marks, dot-repeat, search highlights, macro recording/replay, visual state, Ex messages, cursor placement, and Pi delegation.

## 6. Final Validation

- [x] 6.1 Update user-facing docs only if implementation changes documented behavior or docs drift anchors require existing anchor maintenance.
- [x] 6.2 Run `bun test`.
- [x] 6.3 Run `bun run check-types`.
- [x] 6.4 Run `bun run lint`.
- [x] 6.5 Run `bun run format:check`.
- [x] 6.6 Run `openspec validate --specs --strict`.
- [x] 6.7 Run `graphify update .` after code/spec changes and verify the working tree diff contains only intended files.
