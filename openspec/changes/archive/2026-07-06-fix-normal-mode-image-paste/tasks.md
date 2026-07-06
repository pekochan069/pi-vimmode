## 1. Modal Routing and Protected Shortcut Tests

- [x] 1.1 Add `test/modal.test.ts` coverage that normal-mode `Ctrl-v` with default options clears pending Vim state as needed and emits a raw `delegate` effect instead of entering `visualBlock`.
- [x] 1.2 Add visual-mode coverage for default `Ctrl-v` ownership, or explicitly pin any intentionally retained visual-mode visual-block behavior.
- [x] 1.3 Add coverage that insert-mode `Ctrl-v` still delegates to Pi unchanged.
- [x] 1.4 Add coverage that delegated `Ctrl-v` is not recorded as a normal-mode macro change and does not mutate registers, marks, search highlights, dot-repeat state, or cursor state.
- [x] 1.5 Update `src/modal/engine.ts` to remove hard-coded `Ctrl-v` visual-block branches and rely on protected delegation plus semantic command resolution.

## 2. Keymap, Preset, and Config Behavior

- [x] 2.1 Add config tests that `ctrl+v` is treated as a protected key for user keymap bindings unless the same settings layer lists it in `piVimMode.keymap.allowProtectedOverrides`.
- [x] 2.2 Add command-resolution/modal coverage proving explicit `commands.visualBlock` bindings still enter/switch visual block through the semantic keymap path.
- [x] 2.3 Decide and test preset behavior: built-in presets, including `vim-heavy`, keep visual block unbound by default.
- [x] 2.4 Update `src/customization.ts` protected shortcut metadata and `src/modal/engine.ts` protected delegation allowlist so `:mapcheck ctrl+v` and dispatch agree.
- [x] 2.5 Update `src/config.ts` or preset plumbing only if needed to make protected-override diagnostics and preset behavior consistent.

## 3. Diagnostics and Runtime Help

- [x] 3.1 Add/update `test/customization.test.ts` coverage for `protectedShortcutForKey("ctrl+v")` and `mapcheckMessage(..., "ctrl+v")`.
- [x] 3.2 Add/update runtime help or feature-discovery tests so `:features ctrl+v`/related output describes Pi image/clipboard paste ownership where applicable.
- [x] 3.3 Ensure protected shortcut tables remain bounded and describe explicit pi-vimmode ownership when `ctrl+v` is configured for visual block.

## 4. Specs and Documentation

- [x] 4.1 Update `openspec/specs/vim-mode-editor/spec.md` Pi shortcut compatibility scenarios to cover normal-mode image paste delegation.
- [x] 4.2 Update `openspec/specs/vim-keymap-configuration/spec.md` protected key scenarios to include `Ctrl-v` image/clipboard paste and explicit visual-block opt-in.
- [x] 4.3 Update `docs/features.md` mode table, Pi shortcut compatibility, and visual-block sections so they no longer claim built-in default `Ctrl-v` visual block unless the chosen preset/config path owns it.
- [x] 4.4 Update `docs/settings.md` keymap/protected shortcuts/visualBlock sections with `allowProtectedOverrides` examples for users who intentionally bind `ctrl+v` to visual block.
- [x] 4.5 Check README only for stale quickstart references; keep detailed behavior in `docs/features.md` and `docs/settings.md`.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [ ] 5.5 Run `openspec validate --specs --strict`.
