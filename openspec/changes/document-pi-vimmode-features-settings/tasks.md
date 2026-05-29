## 1. Source Audit

- [ ] 1.1 Read `README.md`, `docs/adr/0001-dedicated-ex-command-line-row.md`, and relevant `docs/solutions/` notes to inventory existing documentation and style.
- [ ] 1.2 Read `src/config.ts` and `src/types.ts` to enumerate every `piVimMode` setting, default, accepted value, parser warning, fallback, protected key, and key notation rule.
- [ ] 1.3 Read feature source files (`src/commands.ts`, `src/buffer.ts`, `src/ex.ts`, `src/render.ts`, `src/vim-editor.ts`, `src/lifecycle.ts`, and `src/modal/*`) to verify supported behavior and limitations.
- [ ] 1.4 Read OpenSpec specs and focused tests for feature behavior examples and drift checks.

## 2. Write User-Facing Docs

- [ ] 2.1 Create `docs/features.md` covering activation, modes, normal motions, normal edits, character search, prompt search, visual modes, Ex substitution, registers, marks, macros, UI/status rendering, cursor hints, Pi shortcut compatibility, limitations, and validation commands.
- [ ] 2.2 Add practical examples or mini-workflows to every major `docs/features.md` feature section.
- [ ] 2.3 Create `docs/settings.md` documenting every supported `piVimMode` setting with path, type/value shape, default, behavior, validation/fallback behavior, and example usage.
- [ ] 2.4 Add settings examples for minimal config, project override, keymap customization, UI/status customization, search highlighting, macros, and marks.

## 3. Add Documentation ADR

- [ ] 3.1 Create a new ADR under `docs/adr/` documenting that `docs/features.md` and `docs/settings.md` are the user-facing pi-vimmode docs.
- [ ] 3.2 In the ADR, record source-of-truth files and require future docs updates to verify `src/config.ts`, `src/types.ts`, OpenSpec specs, and tests before changing feature/settings docs.

## 4. Validate Scope and Completeness

- [ ] 4.1 Cross-check `docs/settings.md` against `DEFAULT_VIM_OPTIONS`, default keymap/UI/search/macro/mark constants, and config parser validation so no setting is missing.
- [ ] 4.2 Cross-check `docs/features.md` against source, specs, and tests so unsupported Vim behavior is not implied.
- [ ] 4.3 Verify final diff touches only `docs/` plus `openspec/changes/document-pi-vimmode-features-settings/`.
- [ ] 4.4 Run OpenSpec validation/status for `document-pi-vimmode-features-settings` and confirm tasks are apply-ready.
