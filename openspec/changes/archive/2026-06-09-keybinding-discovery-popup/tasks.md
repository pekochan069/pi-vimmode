## 1. Popup Contract Tests

- [x] 1.1 Add a focused modal/runtime-help test proving `:features keybindings` opens popup state/output with a title, recipe or preset lines, canonical `prompt.transform.*` IDs, concrete keys, opt-in wording, and no `:map`/plugin/API implication.
- [x] 1.2 Update render/live editor tests to require a visually distinct dedicated overlay popup, not plain inline Ex/workbench row expansion.
- [x] 1.3 Add overflow/scroll tests proving hidden rows behind `… N more` or equivalent indicators are reachable with popup-local controls.
- [x] 1.4 Add a dismissal test proving `Esc` or existing reset behavior closes the popup without changing prompt text, cursor, mode, or effective keymap state.
- [x] 1.5 Add a visual Ex regression test proving `:features keybindings` displays the popup and restores the original visual mode/anchor/cursor without editing prompt text.
- [x] 1.6 Add a side-effect regression test covering popup display/dismissal invariants for search highlights, registers, marks, macros, dot-repeat state, resolved options, diagnostics, and retained messages.
- [x] 1.7 Add a `:messages` regression test proving popup output and repeated popup dismissal do not append to retained message history or remove existing retained messages.
- [x] 1.8 Add popup scroll side-effect tests proving scroll only changes popup offset and never edits prompt/cursor/mode/visual/search/registers/marks/macros/dot-repeat/options/diagnostics/messages.

## 2. Source-Backed Popup Content

- [x] 2.1 Add a small keybinding discovery popup formatter that returns structured title/lines from existing action keybinding recipe/preset metadata and resolved editor options.
- [x] 2.2 Include accepted `piVimMode.keymap.actions` bindings when present, using canonical `prompt.transform.*` IDs and same key vocabulary as `:actions`/`:keymap`/`:mapcheck`.
- [x] 2.3 Include finite boundary lines: opt-in snippets/presets, no defaults, no plugin API, no diagnostic/help action keybinding dispatch, no runtime `:map`, no runtime `:action`, no command palette, no Vim help pager.
- [x] 2.4 Keep formatter pure and small; extract helper/types rather than growing `src/runtime-help.ts`, `src/customization.ts`, or `src/vim-editor.ts` beyond readability limits.

## 3. Modal State, Ex Routing, and Popup Input

- [x] 3.1 Add a typed modal popup state field and helper constructors/clearers without storing popup text in `ExMessage` or `messageHistory`.
- [x] 3.2 Extend typed popup state with a clamped `scrollOffset` or equivalent panel-local viewport state.
- [x] 3.3 Route only `:features keybindings` to the popup in the runtime-help Ex branch; keep `:features redo`, `:help search`, `:actions`, `:keymap`, `:mapcheck`, and `:messages` compact unless tests/specs require otherwise.
- [x] 3.4 Ensure popup display exits Ex command-line mode and restores visual source state using existing Ex diagnostic restoration patterns.
- [x] 3.5 Handle popup-local scroll keys before normal Vim input. At minimum support `j`/`k` and arrow-down/arrow-up for row scrolling while popup is visible.
- [x] 3.6 Ensure unsupported printable keys while popup is visible do not leak into prompt edits or normal/visual commands.
- [x] 3.7 Preserve `Esc` and reset/cancel dismissal with existing Pi protected shortcut delegation semantics after popup-local input handling is added.

## 4. Dedicated Rendering Integration

- [x] 4.1 Replace plain inline popup rows with a dedicated visually separated Pi TUI overlay component.
- [x] 4.2 Add title/header plus footer/border/prefix treatment so users can distinguish popup from Ex command-line/workbench rows.
- [x] 4.3 Cap popup body height to available terminal space or a small fixed limit and render scroll/range indicators for hidden rows above/below.
- [x] 4.4 Fit every panel row, border/header/footer/body included, with existing `visibleWidth`/`truncateToWidth` style helpers so ANSI/cell width behavior remains safe.
- [x] 4.5 Keep no new runtime dependencies and avoid any settings/config surface for popup sizing/scrolling in this slice.
- [x] 4.6 Keep unrelated runtime help/diagnostics compact and non-popup unless explicitly opted in.

## 5. Docs and Drift Guards

- [x] 5.1 Update `docs/features.md` with a keybinding discovery popup section/anchor covering dedicated overlay behavior, entry point, content, scroll controls, dismissal, finite scope, and non-goals.
- [x] 5.2 Update docs-drift tests so the popup docs anchor exists and popup-referenced `prompt.transform.*` action IDs remain registry-backed and documented.
- [x] 5.3 Add or update runtime-help/docs tests proving popup docs do not imply global conversion of `:help`, `:actions`, `:keymap`, `:mapcheck`, or `:messages` to popup output.
- [x] 5.4 Keep detailed setting shapes in `docs/settings.md`; only add cross-links or concise summaries there if needed to avoid duplication.

## 6. Existing Baseline Validation Already Run

- [x] 6.1 Ran `bun test test/runtime-help.test.ts` for the initial bounded inline implementation.
- [x] 6.2 Ran `bun test test/modal.test.ts` for the initial bounded inline implementation.
- [x] 6.3 Ran `bun test test/vim-editor.test.ts` for the initial bounded inline implementation.
- [x] 6.4 Ran `bun test test/docs-drift.test.ts` for the initial bounded inline implementation.
- [x] 6.5 Ran `bun test` for the initial bounded inline implementation.
- [x] 6.6 Ran `bun run check-types` for the initial bounded inline implementation.
- [x] 6.7 Ran `bun run lint` for the initial bounded inline implementation.
- [x] 6.8 Ran `bun run format:check` for the initial bounded inline implementation.
- [x] 6.9 Ran `openspec validate keybinding-discovery-popup --strict` for the initial bounded inline implementation.
- [x] 6.10 Ran `openspec validate --specs --strict` for the initial bounded inline implementation.

## 7. Revised Dedicated Popup Revalidation

- [x] 7.1 Run `bun test test/runtime-help.test.ts` after dedicated overlay/scroll updates.
- [x] 7.2 Run `bun test test/modal.test.ts` after dedicated overlay/scroll updates.
- [x] 7.3 Run `bun test test/vim-editor.test.ts` after dedicated overlay/scroll updates.
- [x] 7.4 Run `bun test test/docs-drift.test.ts` after dedicated overlay/scroll/docs updates.
- [x] 7.5 Run `bun test` after dedicated overlay/scroll/docs updates.
- [x] 7.6 Run `bun run check-types` after dedicated overlay/scroll/docs updates.
- [x] 7.7 Run `bun run lint` after dedicated overlay/scroll/docs updates.
- [x] 7.8 Run `bun run format:check` after dedicated overlay/scroll/docs updates.
- [x] 7.9 Run `openspec validate keybinding-discovery-popup --strict` after dedicated overlay/scroll/docs updates.
- [x] 7.10 Run `openspec validate --specs --strict` after dedicated overlay/scroll/docs updates.
