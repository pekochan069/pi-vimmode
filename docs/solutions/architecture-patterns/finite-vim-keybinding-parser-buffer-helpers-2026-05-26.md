---
title: Finite Vim keybinding parser with pure buffer helpers
date: 2026-05-26
last_updated: 2026-05-27
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding finite Vim-style commands to a prompt editor"
  - "Implementing multi-key editor commands without full Vim grammar"
  - "Separating parser behavior from text-buffer transformations"
  - "Extracting modal editor state into a pure engine behind a Pi CustomEditor adapter"
  - "Adding configurable semantic keymaps without accepting unsupported Vim grammar"
tags:
  - vim-mode
  - keybindings
  - parser
  - buffer-helpers
  - modal-engine
  - adapter-boundary
  - configurable-keymap
  - typescript
  - bun
---

# Finite Vim keybinding parser with pure buffer helpers

## Context

`pi-vimmode` needed more Vim-native prompt-editing commands without becoming a full Vim emulator. The feature added finite normal-mode bindings such as `gg`, `G`, `^`, `_`, `%`, `o`/`O`, `d`/`c`/`y` with selected motions, `cc`, `D`, `C`, `Y`, `J`, and `P`, then evolved those defaults into a configurable semantic keymap.

The risky part was not wiring individual keys. The risky part was keeping three concerns from collapsing into one fragile editor switch:

- pending command grammar (`g`, `d`, `c`, `y`, and custom multi-key prefixes),
- text-buffer transforms and register semantics,
- Pi editor dispatch and shortcut delegation,
- config validation so a user-visible mapping never resolves to a no-op executor path.

## Guidance

Use a three-layer shape first: finite parser, pure buffer helpers, editor dispatch. When modal behavior keeps growing, deepen that shape into a pure modal engine behind the Pi adapter.

### 1. Parse finite grammar through explicit command types

Represent supported grammar explicitly in `src/types.ts`, then have `src/commands.ts` return typed parser results. Do not hide pending-state behavior inside `VimEditor` branches.

```ts
export type VimOperator = "d" | "c" | "y";
export type VimMotion = "w" | "b" | "0" | "^" | "$";
export type PendingOperator = VimOperator | "g";

export type CommandResult =
  | { type: "pending"; operator: PendingOperator }
  | { type: "command"; command: NormalCommand }
  | { type: "operatorMotion"; operator: VimOperator; motion: VimMotion }
  | { type: "invalid" }
  | { type: "none" };
```

Parser rules stay declarative:

```ts
if (pending === "g") {
  if (key === "g") return { type: "command", command: "gg" };
  return { type: "invalid" };
}

if (key === pending) return { type: "command", command: lineCommandFor(pending) };
if (isVimMotion(key)) return { type: "operatorMotion", operator: pending, motion: key };
```

Unsupported pending combinations return `invalid`; normal mode clears pending state without inserting text.

When mappings become configurable, keep semantic actions separate from raw keys. Prefix state should carry enough structure to distinguish an operator prefix from a motion prefix after an operator. A raw concatenated string works for `d` + `w`, but it breaks once operators or motions can be multi-key.

Good pattern:

```ts
const OPERATOR_MOTION_SEPARATOR = "\u0000motion\u0000";
const OPERATOR_LINE_SEPARATOR = "\u0000line\u0000";

function encodeOperatorMotionPending(operatorSequence: string, motionPrefix: string): string {
  return `${operatorSequence}${OPERATOR_MOTION_SEPARATOR}${motionPrefix}`;
}
```

Expose display text separately from internal pending state so status UI can show `qqe…` without depending on parser sentinels.

### 2. Put text semantics in pure `src/buffer.ts` helpers

Keep the editor out of string surgery. Add pure helpers for each behavior family:

- navigation targets: `bufferStartPosition`, `bufferEndPosition`, `firstNonBlankPosition`, `matchingPairPosition`,
- line edits: `openLineAbove`, `openLineBelow`, `joinLineWithNext`, `changeLine`,
- register edits: `pasteRegisterBefore`,
- operator motions: `deleteByMotion`, `yankByMotion`.

This makes edge cases testable without depending on terminal input, Pi cursor behavior, or render state.

### 3. Keep operator motions separate from visual selection

Visual selection helpers are inclusive because they model highlighted text. Operator motions need offset ranges. Reusing visual helpers for `dw`, `d$`, `cw`, or `y^` risks off-by-one deletes and wrong register contents.

Good pattern:

```ts
if (motion === "$") return orderedOffsetRange(current, bounds.end);
if (motion === "0") return orderedOffsetRange(bounds.start, current);
if (motion === "^") {
  const target = bounds.start + firstNonBlankColumn(bounds.line);
  return orderedOffsetRange(current, target);
}
if (motion === "w") return orderedOffsetRange(current, nextWordStartOffset(text, current));
return orderedOffsetRange(previousWordStartOffset(text, current), current);
```

Keep `deleteRange()` / `selectionText()` for visual mode. Use `deleteByMotion()` / `yankByMotion()` for operator commands.

Config should only accept operator motions with executable range semantics. Normal/visual motions such as `right`, `bufferStart`, and `matchingPair` can be valid movement actions while still being invalid after `d`, `c`, or `y` until the buffer module implements matching operator ranges. Reject unsupported operator motions during config parsing with a warning instead of letting the modal engine silently no-op.

### 4. Let `VimEditor` dispatch, not compute

`VimEditor` should bridge parser results to movement, buffer helpers, register updates, and mode transitions. It should continue delegating Pi-owned controls like `Enter`, `Ctrl+C`, and `Ctrl+G`.

```ts
if (pendingResult.type === "operatorMotion") {
  this.pending = undefined;
  this.applyOperatorMotion(pendingResult.operator, pendingResult.motion);
  return;
}
```

Structural edits should call helpers rather than delegate terminal keys. For example, `o`/`O` should insert prompt lines directly instead of sending `Enter`, because `Enter` is Pi-owned submit behavior.

### 5. Document smaller-than-Vim semantics

Do not imply full Vim parity. Document exact support from the current prompt-buffer contract:

- counts are supported for the finite commands that implement them, not arbitrary Vim grammar,
- text objects are supported only for the implemented prompt-buffer objects,
- line-local character search is supported, but prompt search (`/`, `?`, `n`, `N`) is not,
- finite operator motions only,
- `%` supports `()`, `[]`, and `{}` pairs under or after the cursor on the current line.

Keep README limitations aligned with tests whenever the supported command set grows. Stale limitation docs create false bug reports just as quickly as missing docs.

### 6. Evolve heavy editor dispatch into a pure modal engine

When `VimEditor` starts owning mode transitions, register updates, pending operators, visual anchors, status derivation, cursor restoration, terminal cursor hints, and Pi delegation at once, split the dispatch layer again:

- `src/vim-editor.ts` stays the Pi `CustomEditor` adapter. It collects snapshots, calls the modal module, applies effects, restores cursors through public editor behavior, invalidates rendering, and writes best-effort terminal cursor hints.
- `src/modal/engine.ts` owns supported Vim semantics: insert/normal/visual input handling, pending command cleanup, register updates, structural edit decisions, and mode transitions.
- `src/modal/state.ts` owns modal state construction, transient reset, and transition effects while preserving the unnamed register.
- `src/modal/types.ts` defines the adapter boundary: snapshots, modal state, updates, and effects.
- `src/modal/view.ts` derives mode labels, ordered status items, visual status text, and cursor position text without depending on Pi TUI objects.

The core contract is: modal code returns adapter-applied intents; the adapter performs Pi runtime calls. Repeatable edits follow the same rule: store the semantic operation, not a lossy approximation. For example, `dd` and `cc` repeat through a dedicated `lineCommand` repeat state instead of pretending to be character commands.

```ts
export type ModalEffect =
  | { type: "delegate"; input: string }
  | { type: "adapterCommand"; command: AdapterCommand }
  | { type: "edit"; result: EditResult }
  | { type: "restoreCursor"; position: Position }
  | { type: "invalidate" }
  | { type: "terminalCursor"; style: CursorStyle };
```

This keeps pure tests focused on decisions and adapter tests focused on integration smoke.

## Why This Matters

Finite prompt-editor Vim support fails when parser, buffer model, and editor dispatch merge into one switch statement:

- pending keys get swallowed or inserted unpredictably,
- visual inclusive ranges delete the wrong operator-motion text,
- direct terminal delegation can trigger Pi submit behavior,
- edge cases require brittle integration tests instead of cheap unit tests,
- undocumented Vim differences create churn around unsupported behavior.

The parser → buffer helpers → modal engine → adapter split keeps behavior explicit and makes future bindings easier to add safely.

The modal engine extraction adds another payoff: a failing command can be isolated to pure modal state, buffer math, adapter effect application, rendering, cursor restoration, or terminal hints instead of one large `CustomEditor` subclass.

## When to Apply

- Adding normal-mode Vim bindings to `pi-vimmode`.
- Adding pending prefixes such as `g`, `d`, `c`, or `y`.
- Adding configurable key sequences for existing semantic actions.
- Adding prompt text transforms that update the unnamed register.
- Implementing Vim-like behavior with intentionally limited scope.
- Testing modal editor behavior where most cases can be proven below the TUI integration layer.
- Refactoring a `CustomEditor` subclass that mixes product semantics with Pi runtime integration.

## Examples

### Parser-first command addition

Handle pending state first, then create new pending prefixes:

```ts
if (pending === "g") {
  if (key === "g") return { type: "command", command: "gg" };
  return { type: "invalid" };
}

if (key === "g") return { type: "pending", operator: "g" };
```

Then dispatch the narrowed typed result:

```ts
if (pendingResult.type === "command" && pendingResult.command === "gg") {
  this.move("gg");
}
```

### Pure helper for risky text transforms

Prefer this editor code:

```ts
this.applyEdit(joinLineWithNext(this.getText(), this.getCursor()));
```

over inline `setText()` slicing inside `VimEditor`. The helper can be covered in `test/buffer.test.ts`, while editor integration only needs a command-group smoke test.

### Layered tests

Use four tiers:

1. `test/commands.test.ts` — parser matrix, pending states, invalid reset.
2. `test/buffer.test.ts` — range helpers, `%`, line open/join, paste-before, no-op cases.
3. `test/modal.test.ts` — modal state/effect contracts, insert/normal/visual transitions, register preservation, TUI-free status derivation.
4. `test/vim-editor.test.ts` — adapter integration smoke for command groups, cursor restoration, terminal cursor hints, visual render/status integration.

Avoid exploding editor integration tests for every parser combination when parser, buffer, and modal tests already cover the matrix.

### Adapter effect interpreter

Keep `VimEditor` as an interpreter over modal effects:

```ts
private applyEffect(effect: ModalEffect): void {
  switch (effect.type) {
    case "delegate":
      super.handleInput(effect.input);
      return;
    case "adapterCommand":
      super.handleInput(KEY[effect.command]);
      return;
    case "edit":
      this.applyEdit(effect.result);
      return;
    case "restoreCursor":
      this.restoreCursor(effect.position);
      return;
    case "terminalCursor":
      this.applyTerminalCursorStyle(effect.style);
      return;
    case "invalidate":
      this.invalidate();
      return;
  }
}
```

The exact effect union can grow, but each new effect should name one adapter responsibility instead of smuggling Pi calls into the modal module.

Validation for the working implementation:

- `bun test` — 98 passing tests after configurable keymap/UI work
- `bun run check-types`
- `bun run lint`
- `bun run format:check`
- `git diff --check`

## Related

- `src/commands.ts` — finite normal-mode parser
- `src/types.ts` — typed command result model
- `src/buffer.ts` — pure text/register helpers
- `src/modal/engine.ts` — modal input engine for insert, normal, visual, and visual-line modes
- `src/modal/state.ts` — modal state initialization, transient cleanup, and transition effects
- `src/modal/types.ts` — snapshot, state, update, and effect contracts between modal code and adapter
- `src/modal/view.ts` — TUI-free mode/status derivation
- `src/vim-editor.ts` — Pi `CustomEditor` adapter and effect interpreter
- `test/commands.test.ts`, `test/buffer.test.ts`, `test/modal.test.ts`, `test/vim-editor.test.ts` — layered test coverage
- `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md` — concrete bug where line-command repeat state and live option cloning drifted from this architecture
- `docs/solutions/developer-experience/pi-vimmode-auto-activation-2026-05-26.md` — same editor component, focused on lifecycle/activation reliability rather than keybinding behavior
