## 1. Parser and Types

- [x] 1.1 Add `operatorCharSearch` semantic command result and repeatable-change type variants for operator character-search targets.
- [x] 1.2 Add encoded pending parser state for operator + optional target count + char-search command prefix + target character.
- [x] 1.3 Teach `resolveNormalCommand()` to resolve configured `findCharForward`, `findCharBackward`, `tillCharForward`, and `tillCharBackward` commands after motion-capable operators.
- [x] 1.4 Add parser tests for `dfx`, `dtx`, `cFx`, `yTx`, `2dfx`, `d2fx`, combined counts, multi-key configured char-search commands, and unsupported command invalidation.

## 2. Prompt Buffer Operations

- [x] 2.1 Add shared current-line character-search range resolver that returns operator ranges for `f`, `F`, `t`, and `T` without reusing movement-only destinations incorrectly.
- [x] 2.2 Add `deleteByCharSearch` and `yankByCharSearch` operation-level helpers with safe no-op behavior for missing targets and empty till ranges.
- [x] 2.3 Add focused buffer tests for forward/backward inclusion, till exclusion, immediate-target no-op, counts, line-local bounds, cursor placement, and register text.

## 3. Modal Integration

- [x] 3.1 Add `applyOperatorCharSearch()` in normal-mode modal code for delete, change, and yank semantics.
- [x] 3.2 Wire `operatorCharSearch` parser results through modal dispatch without adding raw-key special cases to the adapter.
- [x] 3.3 Update last character-search state only after successful non-empty operator character-search targets so `;` and `,` repeat correctly.
- [x] 3.4 Update dot-repeat state for successful delete/change operator character-search operations and leave yank/no-op operations out of repeatable changes.
- [x] 3.5 Add modal/editor tests for mode transitions, register writes, cursor restoration, search-highlight clearing, dot-repeat, `;`/`,` repeat, no-op safety, and insert-mode delegation.
- [x] 3.6 Expand operator-pending support beyond character search to range-safe normal motions (`h`, `j`, `k`, `l`, `gg`, `G`, `%`) and repeated character-search targets (`;`, `,`).

## 4. Configuration and Documentation

- [x] 4.1 Add keymap configuration tests proving configured and multi-key char-search command bindings work after configured delete/change/yank operators.
- [x] 4.2 Update `docs/features.md` to document `df`, `dF`, `dt`, `dT` and matching `c`/`y` operator targets, counts, repeat behavior, and current-line limitation.
- [x] 4.3 Update `docs/settings.md` operator-target docs to include configured character-search command bindings and preserve unsupported shift-operator limitations.
- [x] 4.4 Update runtime-help or docs-drift expectations if existing tests assert generated keybinding/help content.
- [x] 4.5 Update docs and OpenSpec artifacts so operator target docs no longer say supported motions such as `h`, `l`, `gg`, `G`, and `%` are unsupported.

## 5. Validation

- [x] 5.1 Run `bun test` and fix failures related to parser, buffer, modal, editor, and docs drift behavior.
- [x] 5.2 Run `bun run check-types` and fix TypeScript errors.
- [x] 5.3 Run `bun run lint` and fix lint errors without formatting unrelated user changes.
- [x] 5.4 Run `bun run format:check` and apply only targeted formatting needed for changed files.
- [x] 5.5 Run `openspec validate --specs --strict` and fix OpenSpec issues.
