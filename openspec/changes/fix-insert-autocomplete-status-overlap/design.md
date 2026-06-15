## Context

pi-vimmode is a `CustomEditor` wrapper around Pi's prompt editor. Insert mode intentionally delegates ordinary text and autocomplete behavior to Pi, while pi-vimmode adds a Vim status border by replacing the final rendered editor line with `modalStatus` output in `src/vim-editor.ts`.

That composition is fragile while Pi autocomplete or slash-command completion is open. Completion UI can consume or overlay the same bottom row used for `INSERT`, especially when the completion popup has only one visible row.

## Goals / Non-Goals

**Goals:**

- Keep default `INSERT`/mode status visible when Pi autocomplete is open.
- Preserve Pi-owned insert-mode completion behavior: trigger, navigation, selection, insertion, and protected shortcut delegation.
- Keep all rendered lines width-safe.
- Add regression tests against live `VimEditor` rendering rather than only pure status helpers.

**Non-Goals:**

- Reimplement Pi autocomplete or completion ranking.
- Add Vim popup-menu semantics, completion mappings, or Vimscript compatibility.
- Add new status config fields or aliases; `piVimMode.ui` remains the only status UI configuration surface.

## Decisions

1. **Fix row composition in `src/vim-editor.ts`, not modal state.**
   - Target seams: `VimEditor.render`, `renderEditorLines`, `modalStatus`, autocomplete-open checks through the `CustomEditor` adapter.
   - Rationale: the bug is render composition between Pi autocomplete output and pi-vimmode status output. Modal commands, registers, marks, dot-repeat, search state, visual state, and Ex history should not change.
   - Alternative rejected: add modal state for completion. Pi already owns insert-mode completion; duplicating it would violate insert-mode delegation.

2. **Reserve or position the Vim status row so it does not overwrite completion rows.**
   - Target seams: render line assembly after `super.render(width)` and before appending workbench rows.
   - Rationale: current last-line replacement assumes the last line is safe to turn into status. While autocomplete is open, that line can be completion UI. The implementation should keep completion rows intact and place status in a stable adjacent row, such as a reserved status row above popup content or a reduced prompt viewport that leaves status separate from completion.
   - Alternative rejected: hide the Vim status while autocomplete is open. That makes the user lose the mode cue exactly when insert-mode UI is busy.
   - Alternative rejected: replace completion row with status. That preserves mode feedback but breaks Pi autocomplete visibility.

3. **Use live editor render tests for autocomplete-open behavior.**
   - Target seams: `test/vim-editor.test.ts` or a focused adapter/render test.
   - Rationale: pure `fitStatusBorder` and `modalStatus` tests cannot catch `super.render(width)` interactions or adapter autocomplete state. Tests should simulate `isShowingAutocomplete()` and a default-render output that includes one-row and multi-row completion content.
   - Alternative rejected: snapshot only the final status helper output. It misses the actual overlap path.

4. **Do not add configuration.**
   - Target seams: no changes required in `src/config.ts`, `src/types.ts`, or `cloneOptions` unless implementation discovers an existing option must be propagated.
   - Rationale: this is default render correctness, not a user preference. Existing `piVimMode.ui.status.enabled` and `ui.mode.enabled` should still control whether status appears.
   - Alternative rejected: add `autocompleteStatusPlacement` setting. It increases API surface for a bug fix and risks status-source drift.

## Risks / Trade-offs

- **Autocomplete row detection differs across Pi versions** → Mitigate by using the smallest adapter-visible signal (`isShowingAutocomplete()`) and preserving `super.render(width)` rows instead of parsing completion text when possible.
- **Extra status reservation changes editor height** → Mitigate with tests for idle render, autocomplete-open render, workbench rows, and width safety.
- **Status row might still collide with Ex/search workbench rows** → Mitigate by keeping existing workbench reservation order and adding coverage where autocomplete-open state does not affect pending `/`, `?`, or `:` rows.
- **Fix could break insert fast-path delegation** → Mitigate by leaving `handleInput` fast-path logic unchanged and testing render only.

## Migration Plan

1. Add failing regression coverage for autocomplete-open render with one completion row and default `INSERT` status.
2. Adjust `VimEditor.render` row composition so completion output and status output both remain visible.
3. Verify disabled status configuration still hides status without corrupting completion output.
4. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback is a source revert of the render-composition change and tests. No data migration, config migration, or dependency migration required.

## Open Questions

- Does Pi expose enough structured autocomplete render metadata to identify popup rows, or must tests use a conservative `isShowingAutocomplete()` + preserve-rows strategy?
- If terminal height is too small to show prompt, completion, and status simultaneously, should status take priority over completion or should width/height truncation preserve Pi's completion rows first?
