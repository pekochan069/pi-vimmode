# Related Docs Findings: Ex Command Autocomplete Dropdown Simplification

## 1. Related Docs Found

### High relevance

- **`docs/solutions/ui-bugs/pi-vimmode-autocomplete-status-row-overlap-2026-06-15.md`** — Directly addresses autocomplete row rendering in VimEditor. Documents the `CustomEditor.render()` / `VimEditor.render()` boundary, row ownership model (prompt → autocomplete rows → status → workbench), and the `isShowingAutocomplete()` guard pattern. Core reference for any autocomplete dropdown changes.

- **`docs/solutions/design-patterns/pi-vimmode-read-only-help-overlay-ui-2026-06-09.md`** — Covers row ownership distinction between overlay/workbench UI and host-owned autocomplete rows. Documents the `:features keybindings` help popup pattern and Ex command-line effect-based UI. Relevant because Ex command autocomplete sits at the same render boundary.

- **`docs/solutions/architecture-patterns/pi-vimmode-ex-command-line-substitution-architecture-2026-05-28.md`** — Ex command-line scope boundaries, prompt-local design, and the principle of bounded command set rather than full Vimscript. Sets the architectural ceiling for Ex features.

### Moderate relevance

- **`docs/solutions/architecture-patterns/pi-vimmode-finite-ex-line-commands-architecture-2026-06-01.md`** — Documents the finite typed Ex-command architecture and the `src/modal/ex-command-line.ts` module boundary. References `openspec/specs/vim-ex-command-line/spec.md` for durable requirements.

- **`docs/solutions/design-patterns/pi-vimmode-configurable-insert-mode-newline-keybindings-2026-06-22.md`** — Documents the insert-mode dispatch ordering: escape alias → insert bindings → autocomplete-open delegate to Pi. Relevant because Ex command autocomplete may interact with this dispatch chain.

- **`docs/solutions/architecture-patterns/pi-vimmode-modal-feature-module-extraction-pattern-2026-06-05.md`** — Modal module boundary pattern; `ex-command-line.ts` owns Ex lifecycle. Relevant for understanding where autocomplete simplification would land.

### Low relevance

- **`docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md`** — Mentions `isAutocompleteOpen` in fast-delegate insert input logic. Peripheral.

- **`docs/solutions/developer-experience/pi-vimmode-ctrl-p-insert-mode-delegates-to-pi-2026-06-22.md`** — Insert mode dispatch rule: non-escape, non-autocomplete input delegates to Pi. Peripheral.

- **`docs/solutions/ui-bugs/ex-substitution-match-preview-highlighting-2026-06-04.md`** — Workbench feedback visibility and live-render regression testing pattern. Indirectly relevant for render testing approach.

## 2. Overlap Assessment: **Moderate**

The autocomplete status-row overlap bug doc (`ui-bugs/pi-vimmode-autocomplete-status-row-overlap-2026-06-15.md`) is the closest match — it documents the exact render boundary where autocomplete dropdowns live, the row ownership model, and the `isShowingAutocomplete()` guard. However, it addresses status-row collision, not Ex command autocomplete simplification specifically.

The Ex command-line architecture docs define scope boundaries and the finite command pattern, which constrains what autocomplete in Ex mode should look like.

No existing doc directly covers "simplifying the Ex command autocomplete dropdown." The existing docs provide the architectural context (render model, module boundaries, dispatch ordering) but the specific simplification task is new ground.

## 3. Design-Patterns Directory

**Exists:** `docs/solutions/design-patterns/` is present with 4 files:

- `pi-vimmode-actionable-keybinding-catalog-2026-06-10.md`
- `pi-vimmode-configurable-insert-mode-newline-keybindings-2026-06-22.md`
- `pi-vimmode-read-only-help-overlay-ui-2026-06-09.md`
- `pi-vimmode-search-highlighting-render-precedence-2026-05-28.md`

## 4. Refresh Candidates

No graphify `needs_update` file detected. However, if code changes land for this task, `graphify update .` should be run afterward since several of these docs reference source files (`src/modal/ex-command-line.ts`, `src/vim-editor.ts`, `src/custom-editor.ts`) that would be touched.

## Key Source Files Referenced by Docs

- `src/modal/ex-command-line.ts` — Ex command-line lifecycle, input editing, preview/apply
- `src/vim-editor.ts` — `VimEditor.render()`, `isShowingAutocomplete()`, row composition
- `src/custom-editor.ts` — `CustomEditor.render()`, autocomplete row ownership
- `openspec/specs/vim-ex-command-line/spec.md` — Durable Ex command-line requirements
