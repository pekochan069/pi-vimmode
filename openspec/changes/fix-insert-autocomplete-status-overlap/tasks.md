## 1. Regression Tests

- [ ] 1.1 Add a live `VimEditor` render regression test where insert-mode autocomplete is reported open and default render output contains one completion row; verify both completion content and `INSERT` status remain visible.
- [ ] 1.2 Add a live `VimEditor` render regression test for multi-row autocomplete output; verify no completion row is replaced by Vim status feedback.
- [ ] 1.3 Add a width-safety assertion for autocomplete-open render output at a narrow supported terminal width.
- [ ] 1.4 Add a disabled-status regression test showing `piVimMode.ui.mode.enabled: false` or status item omission hides mode feedback without hiding completion rows.

## 2. Render Composition

- [ ] 2.1 Inspect `CustomEditor` autocomplete render behavior and identify the minimum safe signal/row boundary available to `VimEditor.render`.
- [ ] 2.2 Update `src/vim-editor.ts` so autocomplete-open render output preserves Pi completion rows and places Vim status feedback in a separate visible row where width permits.
- [ ] 2.3 Keep existing workbench row behavior for pending `/`, `?`, `:`, and Ex messages unchanged while autocomplete-open state is present.
- [ ] 2.4 Ensure render changes do not touch modal state, registers, marks, dot-repeat, search highlight state, visual state, Ex history, or insert-mode delegation.

## 3. Documentation Check

- [ ] 3.1 Review `docs/features.md` and `docs/settings.md`; update only if the fix changes documented user-facing behavior or limitations.
- [ ] 3.2 Confirm no new `piVimMode.ui` setting, legacy Vim option alias, or runtime dependency is introduced.

## 4. Validation

- [ ] 4.1 Run `bun test`.
- [ ] 4.2 Run `bun run check-types`.
- [ ] 4.3 Run `bun run lint`.
- [ ] 4.4 Run `bun run format:check`.
- [ ] 4.5 Run `openspec validate --specs --strict`.
