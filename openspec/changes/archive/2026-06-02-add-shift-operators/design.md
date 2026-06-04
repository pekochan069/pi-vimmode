## Context

pi-vimmode already supports prompt-local line transforms through Ex commands: `:indent` adds two spaces to addressed lines and `:dedent` removes at most one tab, two spaces, or one leading space. The missing Vim-fluent surface is the normal/visual shift operator keys `>` and `<`.

The implementation crosses the semantic key parser, keymap config, modal side effects, repeat state, pure prompt-buffer transforms, tests, and docs. The main constraint is keeping this as finite prompt editing, not opening full Vim operator range parity.

## Goals / Non-Goals

**Goals:**

- Support normal-mode `>>` and `<<` for current-line indent/dedent.
- Support counted normal shifts such as `3>>` and `2<<` for consecutive lines from the cursor line.
- Support visual `>` and `<` for all selected lines in visual char, visual line, and visual block modes.
- Reuse existing `indent`/`dedent` transform semantics so Ex and shift operators stay consistent.
- Keep shift operators configurable through the semantic keymap model.
- Preserve existing delete/change/yank, operator-motion, search, mark, visual, register, and Ex behavior.

**Non-Goals:**

- No `>{motion}` or `<{motion}` support in this change.
- No shiftwidth/softtabstop/tabstop settings.
- No full Vim operator-pending grammar, Vimscript, recursive mappings, or Neovim parity.
- No language-aware indentation or Markdown AST formatting.

## Decisions

### Decision 1: Model shifts as semantic line-only operators

Add `indent` and `dedent` to the semantic operator action set with default bindings `>` and `<`.

Target seams:

- `src/types.ts`: extend `VimOperatorAction`.
- `src/config.ts`: defaults, cloning, validation, conflict warnings, docs-facing action names.
- `src/commands.ts`: parser recognition and pending display.
- `src/modal/types.ts`: repeat state can continue using semantic `lineCommand` with the expanded operator type.

Rationale:

- In visual mode, Vim-style operators apply to the current selection immediately. The existing visual handler already treats a pending operator as an operation on the selection, which fits `>` and `<`.
- In normal mode, doubled operators already parse as semantic line commands (`dd`, `cc`, `yy`). `>>` and `<<` can reuse that shape with counts.
- This keeps keymap configuration consistent: users can rebind `piVimMode.keymap.operators.indent` and `dedent` instead of relying on hardcoded visual exceptions.

Alternatives considered:

- Add normal commands `indentLine` / `dedentLine` bound to `>>` / `<<` and hardcode visual `>` / `<` separately. Rejected because normal and visual behavior would have different configuration surfaces and `>` would be both a prefix and a visual command.
- Hardcode `>` / `<` in `modal/engine.ts`. Rejected because it bypasses the semantic keymap and makes configuration/documentation drift likely.

### Decision 2: Keep shift operators line-only in the parser

`indent` and `dedent` SHALL only resolve as line commands when the configured operator sequence is repeated. Unsupported combinations such as `>w`, `>iw`, `>/query`, and `>'a` must clear pending state without editing prompt text or inserting the key.

Target seams:

- `src/commands.ts`: add a helper such as `isLineOnlyOperator()` and restrict `resolveAfterOperator()` / pending operator resolution for `indent` and `dedent` to repeated-operator line commands.
- `src/modal/engine.ts`: keep defensive guards so any unexpected shift operator reaching motion/search/text-object/mark paths invalidates rather than deleting.

Rationale:

- Existing non-yank operator paths often implement delete first, then special-case change. Letting `indent` or `dedent` reach those paths would risk destructive behavior.
- Parser-level restriction makes unsupported scope explicit and testable.

Alternatives considered:

- Allow parser to produce operator-motion/text-object/search results for shifts and no-op later in modal dispatch. Rejected because it spreads safety checks across too many state-machine branches.
- Implement full operator-motion range algebra now. Rejected as out of scope and higher risk.

### Decision 3: Reuse prompt transform operations through a small line-shift helper

Implement normal and visual shifts by resolving a line range and calling the existing prompt transform path with `{ action: "indent" }` or `{ action: "dedent" }`.

Target seams:

- `src/buffer.ts`: add a small pure helper if useful, e.g. `shiftLineRange(text, range, action, cursor)` or `shiftLinesFromCursor(text, cursor, count, action)`, delegating to `applyPromptTransform()`.
- `src/modal/engine.ts`: apply helper results through `editState()` and normal modal effects.

Side effects:

- Registers: shift edits MUST NOT write unnamed or named registers.
- Marks: existing mark positions are not recalculated by this change beyond current editor behavior.
- Dot-repeat: successful normal `>>` / `<<` line commands SHOULD become the last repeatable change; visual shifts do not add new repeat behavior.
- Search highlights: text-changing shift edits clear visible search highlights through `editState()`.
- Visual state: visual shifts clear selection and return to normal mode.
- Cursor: cursor remains on the original line at a valid column after the edit, matching existing prompt transform cursor preservation.
- Ex messages: no Ex message is shown for normal/visual shifts.
- Pi delegation: insert mode and protected Pi shortcuts remain delegated as before.

Rationale:

- Ex transforms already define the exact text semantics. Reusing them prevents two indentation algorithms from drifting.
- Pure buffer helpers keep prompt text surgery out of the modal state machine.

Alternatives considered:

- Duplicate indent/dedent string logic in modal branches. Rejected because it creates behavior drift against `:indent` / `:dedent`.
- Route normal shifts through synthetic Ex commands. Rejected because normal-mode commands should not create Ex messages or command-line state.

### Decision 4: Expose keymap config but keep operator motions scoped

Add default operator bindings:

- `piVimMode.keymap.operators.indent`: `[">"]`
- `piVimMode.keymap.operators.dedent`: `["<"]`

Do not add shift actions to the configurable operator-motion matrix. `piVimMode.keymap.operatorMotions` remains meaningful only for delete/change/yank motion-capable operators.

Implementation SHOULD introduce a narrower motion-capable operator type, such as `VimMotionOperatorAction = "delete" | "change" | "yank"`, or an equivalent guard. Use it for `operatorMotions` and parser branches that can produce operator-motion, search, text-object, or mark operations. Keep `VimOperatorAction` for all operators, including line-only `indent` and `dedent`.

Target seams:

- `src/config.ts`: default keymap, clone keymap, option merge, validation warnings for unsupported `operatorMotions.indent` / `operatorMotions.dedent` if present.
- `src/types.ts`: public keymap option types, including the split between all operators and motion-capable operators.
- `src/vim-editor.ts`: verify existing option cloning still preserves the full keymap when live editors are constructed.
- `docs/settings.md`: document new operator bindings and line-only limitation.

Rationale:

- Users can rebind the shift operator prefix without implying broad range support.
- Keeping the motion matrix scoped avoids false configurability for unsupported `>{motion}` behavior.

Alternatives considered:

- Add empty `operatorMotions.indent` / `dedent` arrays to settings docs. Rejected because users could infer that adding motions enables range shifts.
- Leave shift bindings unconfigurable. Rejected because supported roadmap keybindings should participate in semantic keymap configuration when finite.

## Risks / Trade-offs

- **Risk: New operator actions leak into delete/change/yank paths** → Mitigate with parser-level line-only gating plus defensive modal guards and regression tests for `>w`, `>iw`, `>/query`, and `>'a`.
- **Risk: Config propagation drift** → Mitigate by updating `src/config.ts` clone/default/merge paths and adding live editor or parser/config tests proving configured shift bindings work.
- **Risk: Behavior drift between Ex transforms and shift operators** → Mitigate by delegating to `applyPromptTransform()` rather than duplicating indentation logic.
- **Risk: Mapping conflicts with existing `<` / `>` terminal input assumptions** → Mitigate by limiting ownership to normal/visual modes; insert mode continues delegating typed `<` and `>` to Pi.
- **Risk: Users expect `>{motion}` because `>` is an operator** → Mitigate with explicit docs and safe no-op behavior for unsupported targets.

## Migration Plan

- No data migration or dependency change.
- Implement behind the existing keymap/config surfaces.
- Rollback is removal of the added semantic operators, parser branches, modal shift handling, tests, and docs.
- Existing settings remain valid; invalid or unsupported new settings produce warnings rather than failing startup.

## Open Questions

None. Scope is intentionally limited to line shifts and visual selected-line shifts.
