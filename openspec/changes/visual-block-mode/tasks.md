## 1. Type and State Model

- [ ] 1.1 Add `visualBlock` to `VimMode`, cursor style defaults, visual render input types, and visual selection mode/kind unions.
- [ ] 1.2 Update modal/editor state transitions so visual block stores anchor and cursor consistently with existing visual modes.

## 2. Buffer Semantics

- [ ] 2.1 Add pure helpers for normalizing rectangular block ranges and testing selected block cells.
- [ ] 2.2 Implement visual block yank behavior with newline-joined per-line slices in the unnamed character register.
- [ ] 2.3 Implement visual block delete behavior across ragged lines with cursor clamped to the top-left selected cell.
- [ ] 2.4 Implement visual block change behavior by reusing delete semantics and entering insert mode.
- [ ] 2.5 Add buffer tests for rectangular selection, reversed anchor/cursor order, ragged lines, yank, delete, and change.

## 3. Input and Mode Switching

- [ ] 3.1 Handle `Ctrl-v` from normal mode to enter visual block mode without affecting insert-mode text entry.
- [ ] 3.2 Handle `Ctrl-v`, `v`, and `V` switching among visual block, characterwise visual, and visual line modes while preserving anchor/cursor.
- [ ] 3.3 Route `y`, `d`, `x`, and `c` from visual block mode to blockwise operations with correct mode exit/insert behavior.
- [ ] 3.4 Add command/modal editor tests for visual block enter, cancel, switch, yank, delete, and change flows.

## 4. Rendering

- [ ] 4.1 Extend visual renderer selection predicates to support rectangular block cells.
- [ ] 4.2 Preserve cursor distinction inside selected block cells using existing cursor/selection ANSI ordering.
- [ ] 4.3 Add render tests for block highlights across multiple lines, ragged lines, cursor styling, and width-safe truncation.

## 5. Documentation and Validation

- [ ] 5.1 Update README keymap and visual mode docs with `Ctrl-v`, rectangular highlighting, and supported blockwise operations.
- [ ] 5.2 Run `bun test` and fix failures.
- [ ] 5.3 Run repository typecheck command and fix TypeScript errors.
