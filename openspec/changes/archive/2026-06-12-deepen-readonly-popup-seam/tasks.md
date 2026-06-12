## 1. Shared Popup Seam

- [x] 1.1 Add `src/read-only-popup.ts` (or equivalent) with `ReadOnlyPopupSource`, `ReadOnlyPopup`, `HELP_POPUP_BODY_ROWS`, popup message splitting/building helpers, and scroll clamping.
- [x] 1.2 Add focused tests for popup message splitting, empty-output fallback, scroll clamping at top/bottom, and identity preservation when scroll offset does not change.
- [x] 1.3 Keep compatibility exports or naming aliases needed to avoid broad unrelated renames during extraction.

## 2. Content Builder Rewire

- [x] 2.1 Update `src/keybinding-discovery-popup.ts` to import generic popup types/helpers from the shared popup seam while keeping all existing content builders and command metadata behavior-compatible.
- [x] 2.2 Verify runtime help, keybinding discovery, customization diagnostics, message history, and inspectability popup builders still produce existing titles, sources, docs anchors, queries, and bounded line arrays.
- [x] 2.3 Remove obsolete generic popup type/helper definitions from `src/keybinding-discovery-popup.ts` after all imports are rewired.

## 3. Modal, Overlay, and Adapter Imports

- [x] 3.1 Update `src/modal/types.ts` to import `ReadOnlyPopup` from the shared popup seam instead of keybinding-discovery content.
- [x] 3.2 Update `src/keybinding-discovery-overlay.ts` to import popup type, body row constant, and scroll helper from the shared popup seam.
- [x] 3.3 Update `src/modal/engine.ts` popup scroll handling to use the shared popup helper without changing `openReadOnlyPopup`, `helpPopup`, or modal effect semantics.
- [x] 3.4 Confirm `src/vim-editor.ts` popup effect handling remains adapter-owned and needs no Pi/TUI behavior change.

## 4. Regression and Import-Cycle Guard

- [x] 4.1 Add or update a no-new-dependency import-cycle guard that fails on the current forbidden path between keybinding-discovery popup content, modal inspectability, and modal types.
- [x] 4.2 Run existing popup-backed command tests for `:help`, `:features`, `:keybindings`, `:actions`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`, and `:vimmode inspect`; add focused coverage only where the seam extraction exposes a gap.
- [x] 4.3 Verify popup display, scroll, and dismissal still do not mutate prompt text, cursor, registers, named registers, marks, macro slots, macro recording, search highlights, visual state, dot-repeat, message history, or Pi delegation behavior.
- [x] 4.4 Verify no settings or user-facing docs changes are needed; if implementation changes any behavior or setting, update relevant docs and drift tests in the same patch.

## 5. Graph and Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate deepen-readonly-popup-seam --strict`.
- [x] 5.6 Run `openspec validate --specs --strict`.
- [x] 5.7 Run `graphify update .` after code changes so graph artifacts reflect the removed import cycle.
