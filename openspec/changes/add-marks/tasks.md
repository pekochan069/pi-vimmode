## 1. Mark State and Buffer Helpers

- [ ] 1.1 Add local mark slot/target types to shared or modal types, including lowercase slot validation and transient mark-pending state.
- [ ] 1.2 Extend `ModalState` creation/reset helpers so stored marks survive mode transitions while pending mark/operator state clears safely.
- [ ] 1.3 Add pure buffer helpers to normalize stored mark positions, resolve exact mark targets, resolve line-first-nonblank mark targets, and clamp stale marks to current prompt bounds.
- [ ] 1.4 Add pure buffer helpers for characterwise and linewise ranges between two arbitrary positions if existing visual/range helpers cannot be reused directly.

## 2. Normal and Visual Mark Dispatch

- [ ] 2.1 Teach normal-mode input handling to enter set-mark pending state on `m`, accept `a-z`, reject unsupported slots safely, and overwrite existing marks.
- [ ] 2.2 Teach normal-mode input handling to enter exact-jump pending state on backtick, enter line-jump pending state on single quote, and restore the cursor for valid stored marks.
- [ ] 2.3 Teach visual, visual-line, and visual-block input handling to consume exact and line mark jumps while preserving visual anchors and active selection mode.
- [ ] 2.4 Ensure incomplete mark prefixes render as pending feedback where existing pending-operator feedback is enabled.
- [ ] 2.5 Ensure invalid targets, missing marks, and non-printable inputs clear mark pending state without editing text or corrupting registers.

## 3. Operator Mark Motions

- [ ] 3.1 Model pending operator plus pending mark jump state so `d`, `c`, and `y` can consume backtick/single-quote mark motions.
- [ ] 3.2 Implement characterwise operator ranges for exact mark jumps, covering forward and backward cursor/mark ordering.
- [ ] 3.3 Implement linewise operator ranges for single-quote mark jumps, covering forward and backward line ordering.
- [ ] 3.4 Route yank mark motions through register updates without editing text.
- [ ] 3.5 Route delete and change mark motions through edit effects, with change entering insert mode and all operator/mark pending state consumed.
- [ ] 3.6 Add safety behavior for missing/invalid marks after an operator so prompt text, cursor, marks, and registers remain unchanged.

## 4. Tests

- [ ] 4.1 Add helper tests for mark slot validation, position normalization, exact target resolution, line-first-nonblank target resolution, and stale-position clamping.
- [ ] 4.2 Add normal-mode modal tests for `ma`, overwrite behavior, exact jumps, line jumps, missing marks, invalid targets, and incomplete prefixes.
- [ ] 4.3 Add visual-mode tests proving mark jumps preserve anchors and update selections for characterwise, linewise, and blockwise visual modes.
- [ ] 4.4 Add operator-motion tests for yanking, deleting, and changing to exact marks and line marks in forward and backward ranges.
- [ ] 4.5 Add integration tests or test accessors proving marks are stored per editor/modal state and mark jumps use `restoreCursor` without touching undo/register state except through operator edits.
- [ ] 4.6 Add regression tests proving existing navigation, visual selection, operator-motion, paste/register, and Pi shortcut behavior still works.

## 5. Documentation and TODOs

- [ ] 5.1 Update README keymap/register/navigation sections with `m{slot}`, backtick mark jumps, single-quote mark jumps, lowercase local slot scope, and operator/visual behavior.
- [ ] 5.2 Update README limitations to remove marks from unsupported features while keeping special/global marks, automatic marks, mark lists, persistence, and full edit-adjustment semantics out of scope.
- [ ] 5.3 Update `TODOS.md` to mark `mark` complete only after implementation and validation pass.

## 6. Validation

- [ ] 6.1 Run `bun test` and fix failures.
- [ ] 6.2 Run `bun run check-types` and fix TypeScript errors.
- [ ] 6.3 Run `bun run lint` and `bun run format:check` if available and fix reported issues.
- [ ] 6.4 Run `openspec validate add-marks --strict` or the project-equivalent OpenSpec validation command and fix artifact/spec issues.
