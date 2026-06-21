## 1. Buffer Helpers

- [x] 1.1 Add focused `test/buffer.test.ts` coverage for paragraph navigation, counts, separator-only prompts, first/last paragraph clamping, `ip`, `ap`, `d}`, and `d{` ranges.
- [x] 1.2 Implement blank-line paragraph helpers in `src/buffer.ts` for forward/backward navigation, operator ranges, and paragraph text-object ranges.
- [x] 1.3 Wire paragraph helper contracts into existing `deleteByMotion`, `yankByMotion`, `deleteTextObject`, `yankTextObject`, and `textObjectRange` paths without exposing low-level line math.

## 2. Semantic Keymap

- [x] 2.1 Add command/parser tests for default `{` / `}` motions, `d}` / `d{` operator motions, `ip` / `ap` text objects, configured paragraph bindings, omitted operator-motion safety, and prefix/conflict behavior.
- [x] 2.2 Add `paragraphBackward` / `paragraphForward` motion actions and `paragraph` text-object target to `src/types.ts` and `src/keymap-descriptors.ts`.
- [x] 2.3 Update `src/config.ts` defaults, operator-motion allow-lists, cloning, validation, and warnings for paragraph motion/text-object settings.
- [x] 2.4 Update `src/commands.ts` legacy/semantic motion mapping so default and configured paragraph motions resolve in normal, visual, and operator-pending states.
- [x] 2.5 Update `src/customization.ts` and keybinding catalog metadata so `:keymap`, `:mapcheck`, and `:keybindings` describe paragraph bindings.

## 3. Modal Integration

- [x] 3.1 Add modal tests for normal `{` / `}` movement, visual selection extension, `d}` / `c{` / `y}` register behavior, `dip` / `dap`, safe no-ops, and paragraph change dot-repeat.
- [x] 3.2 Update `src/modal/normal.ts` and visual motion dispatch to call paragraph buffer helpers through existing motion and text-object flows.
- [x] 3.3 Add live `VimEditor` smoke tests for default paragraph keys, configured paragraph motion keys, configured paragraph text-object key, and live options propagation.

## 4. Docs and Drift Guards

- [x] 4.1 Update `docs/features.md` with `{` / `}` motions, `ip` / `ap`, examples, blank-line-only semantics, operator support, visual behavior, and non-goals.
- [x] 4.2 Update `docs/settings.md` with `paragraphBackward`, `paragraphForward`, and `textObjects.targets.paragraph` defaults and configuration notes.
- [x] 4.3 Update runtime help/docs drift tests and keybinding discovery tests for paragraph actions.
- [x] 4.4 Update `TODOS.md` first item after implementation validates.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate --specs --strict` and `openspec validate add-paragraph-motions-text-objects --type change --strict`.
- [x] 5.6 Run `graphify update .` after code changes.
