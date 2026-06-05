## 1. Golden Effect Baseline

- [x] 1.1 Add `test/modal-effects.test.ts` with a reusable modal sequence runner that normalizes `ModalUpdate` state/effect output.
- [x] 1.2 Add golden tests for existing prompt search behavior: `/`, `?`, `n`, `N`, empty query recall, operator-search, search history, and highlight state.
- [x] 1.3 Add golden tests for existing Ex command-line behavior: normal/visual entry, cancel, history navigation, substitution match preview/apply, invalid ranges, nohlsearch, and diagnostic commands.
- [x] 1.4 Add golden tests for visual char, visual-line, and visual-block operations, including source visual restoration from Ex command-line mode.
- [x] 1.5 Add golden tests for macro record/play behavior, replay guards, register writes, mark jumps, dot-repeat preservation, and protected Pi shortcut delegation.
- [x] 1.6 Run the new golden tests before refactoring and confirm they pass against current behavior.

## 2. Inspect and Message Core

- [x] 2.1 Add inspect/message types to the modal layer for bounded message entries, inspect snapshot input, and inspect/message formatter output.
- [x] 2.2 Implement pure inspect summary helpers for mode, pending state, cursor, visual selection, registers, marks, macros, search, Ex/workbench, diagnostics, and render summary.
- [x] 2.3 Implement bounded message-log helpers with a fixed v1 cap, chronological or clearly labeled recent-first output, and no full prompt/register/macro dumps.
- [x] 2.4 Add unit tests for inspect summaries, message cap behavior, redaction/truncation, large-state bounds, and warning summaries.
- [x] 2.5 Confirm no settings were added; if a setting becomes necessary, update `src/config.ts`, `src/types.ts`, `VimEditor` `cloneOptions`, docs, and live editor tests before proceeding.

## 3. Ex Parser and Diagnostic Commands

- [x] 3.1 Extend `src/ex.ts` parsed diagnostic command types to include exact `vimmode inspect` and `messages` commands.
- [x] 3.2 Add parser tests for accepted syntax `:vimmode inspect` and `:messages`.
- [x] 3.3 Add parser/error tests for unsupported syntax such as `:vimmode`, `:vimmode status`, `:vimmode inspect raw`, `:messages clear`, and `:mes`.
- [x] 3.4 Wire modal Ex execution for inspect/messages to restore normal or captured visual source mode using existing diagnostic source-mode rules.
- [x] 3.5 Add modal tests proving inspect/messages leave prompt text, cursor, registers, marks, macros, search state, visible highlights, and repeat-change state unchanged except diagnostic feedback/message history.

## 4. Modal Message Integration

- [x] 4.1 Add message logging around selected Ex errors, Ex successes, customization diagnostics, inspect diagnostics, messages diagnostics, and enabled no-op/protected shortcut feedback.
- [x] 4.2 Keep transient `exMessage` as the current workbench row feedback source and store message history separately.
- [x] 4.3 Add tests proving transient messages clear on later handled input while `:messages` can still show retained entries.
- [x] 4.4 Add tests proving substitution previews clear safely when diagnostic command execution replaces pending Ex state and no stale edit applies.
- [x] 4.5 Add tests for bounded `:messages` output after more events than the fixed cap.

## 5. Modal Feature Module Extraction

- [x] 5.1 Extract shared modal helpers/effect constructors into a small core module to avoid feature-module import cycles.
- [x] 5.2 Extract prompt search handling from `src/modal/engine.ts` into a focused search feature module and rerun golden search tests.
- [x] 5.3 Extract Ex command-line lifecycle/execution handling into a focused Ex feature module and rerun golden Ex tests.
- [x] 5.4 Extract visual char/line/block handling into a focused visual feature module and rerun golden visual tests.
- [x] 5.5 Extract macro record/play handling into a focused macro feature module and rerun golden macro tests.
- [x] 5.6 Extract normal-mode dispatch helpers where needed so `applyCommand`, `executeExCommand`, `handleNormalInput`, and `handleVisualInput` stay reviewable.
- [x] 5.7 Verify feature modules import modal/buffer/parser helpers only and do not import Pi `CustomEditor`, TUI, lifecycle, or adapter runtime APIs.

## 6. Adapter, Render, and Docs

- [x] 6.1 Update `VimEditor` only as needed to pass render/workbench summary data into inspect formatting while keeping Pi runtime calls adapter-owned.
- [x] 6.2 Add live editor smoke tests for `:vimmode inspect`, `:messages`, render/workbench row preservation, cursor restoration, and Pi delegation after extraction.
- [x] 6.3 Add or update render/view tests proving inspect/messages do not add a permanent render surface or change search/visual/cursor precedence.
- [x] 6.4 Update `docs/features.md` with `:vimmode inspect`, `:messages`, output categories, message retention limit, redaction behavior, and unsupported Vim diagnostics.
- [x] 6.5 Confirm README remains a quickstart/docs index and update it only if docs links change.

## 7. Validation

- [x] 7.1 Run `bun test` and fix failures.
- [x] 7.2 Run `bun run check-types` and fix failures.
- [x] 7.3 Run `bun run lint` and fix failures.
- [x] 7.4 Run `bun run format:check` and fix failures.
- [x] 7.5 Run `openspec validate architecture-runway-sprint-with-inspectability --type change --strict` and fix failures.
- [x] 7.6 Run `openspec validate --specs --strict` and fix failures.
- [x] 7.7 Run `openspec status --change "architecture-runway-sprint-with-inspectability"` and confirm the change is apply-ready.
