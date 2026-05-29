## 1. Source Audit

- [x] 1.1 Read `README.md`, `docs/adr/0001-dedicated-ex-command-line-row.md`, and relevant `docs/solutions/` notes to inventory existing documentation and style.
- [x] 1.2 Read `src/config.ts` and `src/types.ts` to enumerate every `piVimMode` setting, default, accepted value, parser warning, fallback, protected key, and key notation rule.
- [x] 1.3 Read feature source files (`src/commands.ts`, `src/buffer.ts`, `src/ex.ts`, `src/render.ts`, `src/vim-editor.ts`, `src/lifecycle.ts`, and `src/modal/*`) to verify supported behavior and limitations.
- [x] 1.4 Read OpenSpec specs and focused tests for feature behavior examples and drift checks.

## 2. Write User-Facing Docs

- [x] 2.1 Create `docs/features.md` covering activation, modes, normal motions, normal edits, character search, prompt search, visual modes, Ex substitution, registers, marks, macros, UI/status rendering, cursor hints, Pi shortcut compatibility, limitations, and validation commands.
- [x] 2.2 Add practical examples or mini-workflows to every major `docs/features.md` feature section.
- [x] 2.3 Create `docs/settings.md` documenting every supported `piVimMode` setting with path, type/value shape, default, behavior, validation/fallback behavior, and example usage.
- [x] 2.4 Add settings examples for minimal config, project override, keymap customization, UI/status customization, search highlighting, macros, and marks.

## 3. Add Documentation ADR

- [x] 3.1 Create a new ADR under `docs/adr/` documenting that `docs/features.md` and `docs/settings.md` are the user-facing pi-vimmode docs.
- [x] 3.2 In the ADR, record source-of-truth files and require future docs updates to verify `src/config.ts`, `src/types.ts`, OpenSpec specs, and tests before changing feature/settings docs.

## 4. Validate Scope and Completeness

- [x] 4.1 Cross-check `docs/settings.md` against `DEFAULT_VIM_OPTIONS`, default keymap/UI/search/macro/mark constants, and config parser validation so no setting is missing.
- [x] 4.2 Cross-check `docs/features.md` against source, specs, and tests so unsupported Vim behavior is not implied.
- [x] 4.3 Verify initial documentation diff touched only `docs/` plus `openspec/changes/document-pi-vimmode-features-settings/` before review follow-up.
- [x] 4.4 Run OpenSpec validation/status for `document-pi-vimmode-features-settings` and confirm tasks are apply-ready.

## 5. Document Review Follow-up

- [x] 5.1 Apply clear ce-doc-review fixes to generated docs for Enter/search/Ex behavior, visual motions, macro recording, status rendering, disable/recovery guidance, warning diagnostics, and examples.
- [x] 5.2 Fix source/test drift surfaced by review: protected Pi shortcut delegation, configured operator search entry, and modifier-order protected-key validation.
- [x] 5.3 Append README canonical-doc role decision to the documentation ADR Open Questions section.
- [x] 5.4 Re-run targeted formatting, tests, typecheck, lint, and OpenSpec validation.
