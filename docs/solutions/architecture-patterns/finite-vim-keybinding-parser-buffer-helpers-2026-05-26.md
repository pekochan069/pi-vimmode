---
title: Finite Vim keybinding parser with pure buffer helpers
date: 2026-05-26
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding finite Vim-style commands to a prompt editor"
  - "Implementing multi-key editor commands without full Vim grammar"
  - "Separating parser behavior from text-buffer transformations"
tags:
  - vim-mode
  - keybindings
  - parser
  - buffer-helpers
  - typescript
  - bun
---

# Finite Vim keybinding parser with pure buffer helpers

## Context

`pi-vimmode` needed more Vim-native prompt-editing commands without becoming a full Vim emulator. The feature added finite normal-mode bindings such as `gg`, `G`, `^`, `_`, `%`, `o`/`O`, `d`/`c`/`y` with selected motions, `cc`, `D`, `C`, `Y`, `J`, and `P`.

The risky part was not wiring individual keys. The risky part was keeping three concerns from collapsing into one fragile editor switch:

- pending command grammar (`g`, `d`, `c`, `y`),
- text-buffer transforms and register semantics,
- Pi editor dispatch and shortcut delegation.

## Guidance

Use a three-layer shape: finite parser, pure buffer helpers, editor dispatch.

### 1. Parse finite grammar in `src/commands.ts`

Represent supported grammar explicitly in types, then return typed parser results. Do not hide pending-state behavior inside `VimEditor` branches.

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

Do not imply full Vim parity. Document exact support:

- no counts,
- no text objects,
- no full Vim grammar,
- finite operator motions only,
- `%` supports `()`, `[]`, and `{}` under or after the cursor on the current line.

This keeps future bug reports and follow-up work anchored to the prompt-editor contract rather than full Vim behavior.

## Why This Matters

Finite prompt-editor Vim support fails when parser, buffer model, and editor dispatch merge into one switch statement:

- pending keys get swallowed or inserted unpredictably,
- visual inclusive ranges delete the wrong operator-motion text,
- direct terminal delegation can trigger Pi submit behavior,
- edge cases require brittle integration tests instead of cheap unit tests,
- undocumented Vim differences create churn around unsupported behavior.

The parser → buffer helpers → editor dispatch split keeps behavior explicit and makes future bindings easier to add safely.

## When to Apply

- Adding normal-mode Vim bindings to `pi-vimmode`.
- Adding pending prefixes such as `g`, `d`, `c`, or `y`.
- Adding prompt text transforms that update the unnamed register.
- Implementing Vim-like behavior with intentionally limited scope.
- Testing modal editor behavior where most cases can be proven below the TUI integration layer.
- Reconciling OpenSpec changes where tasks mention commands not yet defined in proposal, design, or spec.

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

Use three tiers:

1. `test/commands.test.ts` — parser matrix, pending states, invalid reset.
2. `test/buffer.test.ts` — range helpers, `%`, line open/join, paste-before, no-op cases.
3. `test/vim-editor.test.ts` — integration smoke for command groups, mode transitions, register effects, visual regressions.

Avoid exploding editor integration tests for every parser combination when parser and buffer tests already cover the matrix.

Validation for the working implementation:

- `bun test` — 63 passing tests
- `bun run check-types`
- `bun run lint`
- `git diff --check`

## Related

- `src/commands.ts` — finite normal-mode parser
- `src/types.ts` — typed command result model
- `src/buffer.ts` — pure text/register helpers
- `src/vim-editor.ts` — editor dispatch and mode transitions
- `test/commands.test.ts`, `test/buffer.test.ts`, `test/vim-editor.test.ts` — layered test coverage
- `docs/solutions/developer-experience/pi-vimmode-auto-activation-2026-05-26.md` — same editor component, focused on lifecycle/activation reliability rather than keybinding behavior
