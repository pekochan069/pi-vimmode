## Context

`pi-vimmode` currently uses one-row transient/workbench feedback for runtime discovery. `:actions`, `:keymap`, `:mapcheck`, `:features`, `:help`, and `:messages` are finite, read-only Ex surfaces that preserve prompt state and avoid Vim parity claims.

Recent action-keybinding work added richer metadata:

- `src/action-keybinding-recipes.ts` owns opt-in keybinding recipes and presets surfaced by `:features keybindings`.
- `src/prompt-transform-actions.ts` owns canonical bindable `prompt.transform.*` action metadata.
- `src/diagnostic-actions.ts` owns metadata-only `vimmode.*` diagnostic/runtime-help entries.
- `src/customization.ts` owns `:actions`, `:keymap`, `:mapcheck`, protected shortcut lookup, and diagnostic messages.
- `src/runtime-help.ts` owns source-backed `:help`, `:features`, and `:messages` messages.
- `src/vim-editor.ts` renders prompt/editor lines and workbench feedback.

The cramped surface is now `:features keybindings`: it has useful recipe/preset data, but a plain multi-row workbench expansion looks like the Ex section got taller. It also has a dead-end overflow indicator (`… N more`) when content does not fit. This change introduces a visually dedicated overlay with local scrolling for that selected command without turning runtime help into a Vim pager, command palette, or mapping API.

## Goals / Non-Goals

**Goals:**

- Make `:features keybindings` open a dedicated bordered/readably separated overlay popup, not plain inline Ex/workbench rows.
- Keep the popup bounded to the prompt editor viewport and width-safe.
- Provide popup-local scrolling when source-backed lines exceed visible rows, so every popup line is reachable.
- Source popup content from existing registries and effective editor options, not duplicated prose.
- Include action keybinding recipes/presets, accepted configured action bindings when present, canonical action IDs, opt-in/no-default wording, and explicit non-goals.
- Dismiss popup predictably through existing cancel/reset behavior such as `Esc`.
- Preserve prompt text, cursor, mode restoration, visual state, search highlights, registers, marks, macros, dot-repeat, resolved options, diagnostics, and message-history boundaries across display, scroll, and dismissal.
- Keep docs/spec/test anchors aligned through docs-drift validation.

**Non-Goals:**

- No full Vim/Neovim help pager, help tags, `:h`, tag navigation, or scrollable help buffer.
- No fuzzy command palette or executable action picker.
- No runtime `:map`, `:action`, recursive mappings, Vimscript, Neovim Lua, `.vimrc`, plugin API, or user-defined action registry.
- No default action keybindings.
- No broad UI framework rewrite.
- No new configuration surface for popup behavior in this slice.
- No mutation of prompt text, registers, marks, macros, search state, dot-repeat, diagnostics, retained message history, or effective keymaps from popup display, popup scroll, or popup dismissal.

## Decisions

### Decision: Add popup state with panel-local scroll offset, not a retained message

Target seams: `src/modal/types.ts`, `src/modal/state.ts`, `src/modal/core.ts`, `src/modal/engine.ts`, `src/modal/ex-command-line.ts`, and `src/vim-editor.ts`.

Use a small state shape such as `helpPopup?: { title: string; lines: readonly string[]; source: "features"; query: "keybindings"; scrollOffset: number; docsAnchor: string }`. Treat popup display and scroll offset as transient UI state like workbench feedback, but keep it separate from `ExMessage` and `messageHistory` so `:messages` remains stable. Dismissal should clear only popup state and pending transient input, not durable modal state.

Alternatives considered:

- Store popup output as an `exMessage`: rejected because `ExMessage` is one-line by design and message history retention would become ambiguous.
- Store popup output in `messageHistory`: rejected because `:messages` must not become a help log and must not retain popup output or scroll events.
- Implement popup as prompt text or a synthetic buffer: rejected because it risks prompt mutation, cursor drift, undo/dot-repeat issues, and misleading help-pager semantics.
- Leave overflow as `… N more` only: rejected because users cannot inspect hidden lines.

### Decision: Route only selected discovery commands to popup in M1

Target seam: `src/modal/ex-command-line.ts` runtime-help branch.

M1 should route `:features keybindings` to popup state. Other `:features` queries and `:help`/`:actions`/`:keymap` should keep existing one-line messages unless separately required later. This keeps compatibility and blast radius tight while proving the display model on the known cramped use case.

Alternatives considered:

- Convert all runtime help to popup: rejected because many tests and users depend on compact transient messages, and broad conversion increases UI risk.
- Add a new Ex command such as `:keybindings`: rejected because existing `:features keybindings` already expresses the discovery intent and avoids parser expansion.
- Add popup behind `:help keybindings` first: acceptable as a later additive entry point, but M1 should start with one command to keep scope tight.

### Decision: Build popup content from existing metadata helpers

Target seams: `src/action-keybinding-recipes.ts`, `src/runtime-help.ts`, `src/customization.ts`, `src/config.ts`, and `src/keybinding-discovery-popup.ts`.

The formatter returns structured title/lines for keybinding discovery. It should reuse existing recipe/preset metadata, resolved `keymap.actions.accepted`, bindable prompt transform action entries, diagnostic/help metadata limits, and protected shortcut catalog notes.

Content should include:

- Title such as `Keybinding discovery`.
- Recipe/preset section with IDs and concrete key/action pairs.
- Current accepted action bindings section when configured bindings exist.
- Boundary section: opt-in only, no defaults, no plugin API, no diagnostic/help keybinding dispatch, no runtime `:map`.
- Hints for existing finite diagnostics such as `:keymap <action>`, `:mapcheck <key>`, and `:actions <query>`.

Alternatives considered:

- Duplicate docs snippets in popup code: rejected because recipe/preset/action IDs would drift from registries and docs-drift tests.
- Render `docs/features.md` excerpts: rejected because that implies a help/document pager and couples runtime behavior to prose files.
- Generate content from parser grammar alone: rejected because parser does not know recipe docs anchors, opt-in preset semantics, or protected shortcut rationale.

### Decision: Render a dedicated bounded overlay popup with actionable scroll indicators

Target seams: `src/vim-editor.ts` and maybe `src/render.ts`.

Render the popup as a dedicated Pi TUI overlay, visually separated from Ex/workbench feedback. The overlay has a title/header, footer, and border treatment so it is not perceived as the Ex command-line section increasing in height. It should float above existing terminal content rather than append rows to the editor render output.

Panel rendering rules:

- Fit every row to `visibleWidth`/`truncateToWidth` constraints.
- Cap body height to available terminal space or a small fixed maximum.
- Show a scroll/range indicator such as `1-8/16`, `↑ 3`, `↓ 5`, or equivalent when rows are hidden above/below.
- Show key hints in a footer, e.g. `j/k or ↑/↓ scroll • Esc close`.
- When content fits, no misleading `… N more` dead-end is needed.
- When content overflows, hidden lines must be reachable via popup-local scroll.

Alternatives considered:

- Plain inline rows plus `… N more`: rejected because it looks like the Ex section grew and hidden rows are inaccessible.
- Full floating overlay independent of normal editor rows: rejected for now because Pi TUI layout may not expose a safe overlay layer and the prompt/cursor composition should stay simple.
- Unbounded output log: rejected because it breaks finite prompt-local help guarantees.
- External TUI popup dependency: rejected unless already available through existing peers; no new runtime dependency should be added.

### Decision: Popup-local scroll keys are handled before normal Vim input

Target seams: `src/modal/engine.ts`, `src/modal/core.ts`, and modal tests.

When popup is visible, popup input handling runs before normal/visual/editor command handling. At minimum, `j`/`k` and arrow-down/arrow-up scroll one row within the popup. `g`/`G` may jump top/bottom if cheap. Unsupported printable keys should be ignored while the popup is visible rather than leaking into prompt edits. `Esc` and delegated reset/cancel behavior should dismiss the popup. Protected Pi shortcuts should preserve existing delegation semantics unless explicitly used only for dismissal.

Scroll events update only `helpPopup.scrollOffset` and invalidate render. They must not edit prompt text, move cursor, change mode, alter registers/marks/macros/search/dot-repeat/options/diagnostics, or append message history.

Alternatives considered:

- Require only `Esc` and no scrolling: rejected because overflow is not actionable.
- Use `Ctrl-d`/`Ctrl-u` as primary scroll keys: rejected because `Ctrl-d` is Pi-owned/protected in this editor and should remain protected.
- Let any key close popup and continue processing: rejected because it can create surprising edits/actions after a help surface appears.
- Treat popup as a Vim help buffer with full pager commands: rejected as too broad and semantically misleading.

### Decision: Dismiss through existing reset/cancel paths and preserve read-only invariants

Target seams: `src/modal/engine.ts`, `src/modal/core.ts`, and modal tests.

When popup is visible, `Esc` and delegated reset/cancel keys should clear popup state. Dismissal must not edit text, move cursor, clear registers/marks/macros/search history, change dot-repeat, or append message history. Existing protected Pi shortcut ownership should remain intact; if a reset key already delegates to Pi after clearing state, preserve that behavior where appropriate.

Alternatives considered:

- Require a popup-specific close key such as `q`: rejected for M1 because `Esc` is already the project-wide cancel affordance. `q` can be additive later if users ask.
- Keep popup until next Ex command: rejected because it makes the prompt feel stuck and blocks normal editing feedback.

### Decision: Drift-guard popup docs and output anchors

Target seams: `docs/features.md`, `test/docs-drift.test.ts`, `openspec/specs/runtime-help-drift-guard/spec.md`, and focused runtime tests.

Docs should explain the dedicated overlay, what appears, how to scroll, how to dismiss, and what is intentionally absent. Runtime tests should verify representative output rather than snapshotting every line.

Alternatives considered:

- Treat popup as implementation-only UI polish: rejected because runtime help is user-facing behavior and previous runtime-help/action registry work relies on docs/spec/test anchors to prevent drift.
- Snapshot full popup output: rejected if brittle; prefer assertions for title, key action IDs, accepted bindings, opt-in/no-default wording, no-pager/no-map boundaries, scroll footer/range, and bounds.

## Risks / Trade-offs

- Popup becomes accidental Vim help pager → Mitigation: local scroll offset only, no help tags, no tag navigation, no synthetic buffer, no broad runtime-help conversion.
- Popup still looks like inline Ex rows → Mitigation: require border/title/footer or equivalent visual separation in tests.
- Popup content drifts from recipes/actions/docs → Mitigation: source content from registries and extend docs-drift tests for popup anchors and recipe/action IDs.
- Scroll keys leak into prompt edits → Mitigation: handle popup input before normal Vim input and add regression tests that prompt/cursor/registers/etc. do not change while scrolling.
- Dismissal clears too much modal state → Mitigation: add side-effect regression tests covering prompt/cursor/visual/search/registers/marks/macros/dot-repeat/message history.
- Render layering breaks cursor/search/visual display → Mitigation: keep popup render composition in `VimEditor.render` or a small render helper that receives already-derived editor rows; test line bounds and width safety.
- One-line command compatibility regresses → Mitigation: route only `:features keybindings` to popup in M1; keep other queries using current messages.
- Functions grow past readability rule → Mitigation: extract popup formatter/render/input helpers before adding branching to `runtime-help.ts`, `vim-editor.ts`, or `modal/engine.ts`.

## Migration Plan

1. Update tests so `:features keybindings` must render as a dedicated bordered/separated overlay popup, not plain inline rows.
2. Add popup scroll-state tests for overflow, scroll down/up, clamping at top/bottom, width safety, and message-history isolation.
3. Add/extend popup state with `scrollOffset` and helper functions to clamp/update it.
4. Handle popup-local scroll/dismissal input before normal/visual/editor command processing.
5. Render bordered/separated overlay rows with title, body, footer, scroll/range indicators, and width-safe truncation.
6. Update docs and docs-drift tests for dedicated overlay and scroll controls.
7. Validate with focused tests, full tests, type/lint/format checks, and OpenSpec validation.

Rollback: remove popup route/render/state and leave existing `runtimeFeaturesMessage("keybindings")` one-line behavior intact. Because this is additive display state, no data migration is needed.

## Open Questions

- Exact border glyphs and colors can be chosen during implementation. Requirement is visually distinct, bounded, width-safe, and not plain Ex/workbench rows.
- `j`/`k` and arrow keys are required for popup-local row scrolling. `g`/`G` top/bottom can be added if the input layer makes it cheap.
- `:help keybindings` can become a later popup entry point if M1 proves the model; not required for apply-ready scope.
