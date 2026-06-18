## 1. Buffer Movement

- [x] 1.1 Add focused buffer tests for half-page cursor movement: down, up, count multiplier, column clamping on shorter target lines, prompt start/end clamping, and empty prompt safety
- [x] 1.2 Add a pure `src/buffer.ts` helper that moves a cursor by signed prompt-line count and clamps the resulting `Position`

## 2. Semantic Keymap and Config

- [x] 2.1 Add `halfPageDown` and `halfPageUp` motion action types, default key descriptors (`ctrl+d`, `ctrl+u`), and user-facing descriptions
- [x] 2.2 Add command resolver tests for default `<C-d>` / `<C-u>`, counts, custom motion bindings, and duplicate/prefix precedence safety
- [x] 2.3 Update keymap config validation so `ctrl+d` / `ctrl+u` are allowed only for the explicit scroll motion ownership path and remain rejected for unrelated bindings
- [x] 2.4 Add config tests proving default scroll bindings, custom scroll bindings, unsupported `operatorMotions` entries, warnings, and live `VimEditor` option cloning behavior

## 3. Modal and Adapter Integration

- [x] 3.1 Extend modal snapshot/input data with the minimal viewport row value needed to resolve half-page size from the live editor
- [x] 3.2 Wire `halfPageDown` and `halfPageUp` through normal and visual `moveUpdate` without adding ad-hoc raw-key branches
- [x] 3.3 Make protected-shortcut routing mode-aware so insert mode and Pi-owned contexts still delegate control shortcuts while normal/visual scroll keys reach the parser
- [x] 3.4 Add modal/editor tests for normal scroll, visual anchor preservation, boundary no-op behavior, no register/search/dot-repeat side effects, and insert-mode delegation

## 4. Docs and Discovery

- [x] 4.1 Update runtime keybinding catalog output so scroll motions appear with accurate descriptions and mode ownership
- [x] 4.2 Update `docs/features.md` with `<C-d>` / `<C-u>` behavior, counts, boundaries, and deferred scroll features
- [x] 4.3 Update `docs/settings.md` with `halfPageDown` / `halfPageUp` motion action names, defaults, configuration examples, and operator-motion limitation
- [x] 4.4 Update docs drift or customization tests that assert supported keybinding/docs anchors

## 5. Validation

- [x] 5.1 Run `bun test`
- [x] 5.2 Run `bun run check-types`
- [x] 5.3 Run `bun run lint`
- [x] 5.4 Run `bun run format:check`
- [x] 5.5 Run `openspec validate --specs --strict`
