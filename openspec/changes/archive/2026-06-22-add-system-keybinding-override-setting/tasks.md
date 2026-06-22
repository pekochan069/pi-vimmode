## 1. Config Surface

- [x] 1.1 Add `allowProtectedOverrides?: readonly string[]` to `VimKeymapOptions` and `PartialKeymapOptions`.
- [x] 1.2 Parse `piVimMode.keymap.allowProtectedOverrides` with existing key-sequence normalization and warning behavior.
- [x] 1.3 Thread a same-layer `allowProtectedKey` predicate through classic keymap groups and `keymap.escape` parsing.
- [x] 1.4 Thread the same-layer protected-key predicate through `piVimMode.keymap.actions` parsing.
- [x] 1.5 Ensure defaults and built-in presets never set `allowProtectedOverrides`.

## 2. Config Tests

- [x] 2.1 Add tests that protected keys remain rejected when `allowProtectedOverrides` is absent.
- [x] 2.2 Add tests that allow-listed protected classic bindings are accepted and normalized.
- [x] 2.3 Add tests that allow-listed protected action bindings are accepted unless another action validation rule rejects them.
- [x] 2.4 Add tests that global allow-list entries do not authorize project-layer protected bindings without a project allow-list.
- [x] 2.5 Add tests that invalid allow-list entries warn while valid protected entries and sibling keymap fields remain usable.

## 3. Modal Runtime

- [x] 3.1 Update normal-mode protected shortcut routing so effective keymap bindings dispatch before Pi delegation.
- [x] 3.2 Update visual-mode protected shortcut routing with the same effective-keymap-before-delegation behavior.
- [x] 3.3 Preserve Pi delegation for protected keys that are unmapped or unsupported in the current modal context.
- [x] 3.4 Preserve insert-mode Pi delegation except for accepted configured escape aliases.

## 4. Runtime Tests

- [x] 4.1 Add live editor test for allow-listed `ctrl+p` normal-mode command dispatch.
- [x] 4.2 Add live editor test for allow-listed protected visual-mode command dispatch where supported.
- [x] 4.3 Add live editor test that unmapped protected shortcuts still delegate to Pi and do not become unmapped Vim keys.
- [x] 4.4 Add live editor test for explicit protected insert escape alias behavior.

## 5. Documentation

- [x] 5.1 Update `docs/settings.md` with `piVimMode.keymap.allowProtectedOverrides`, default empty behavior, same-layer scope, examples, and terminal/Pi delivery caveats.
- [x] 5.2 Update `docs/features.md` with protected shortcut override behavior and runtime limits.

## 6. Validation

- [x] 6.1 Run `bun test`.
- [x] 6.2 Run `bun run check-types`.
- [x] 6.3 Run `bun run lint`.
- [x] 6.4 Run `bun run format:check`.
- [x] 6.5 Run `openspec validate --specs --strict`.
