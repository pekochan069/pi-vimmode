---
title: Pi vimmode prompt-local linear redo
date: 2026-06-04
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding undo/redo-like behavior on top of a host editor that only exposes native undo"
  - "Adding a Vim command whose state lives at the adapter boundary rather than in pure modal logic"
  - "Preserving Pi-owned insert-mode shortcuts while owning a control key in normal mode"
related_components:
  - modal-engine
  - editor-adapter
  - keymap-configuration
  - documentation
tags: [pi-vimmode, redo, undo, vim-editor, modal-engine, keymap, adapter-state]
---

# Pi vimmode prompt-local linear redo

## Context

`pi-vimmode` needed normal-mode `Ctrl-r` redo after `u` undo, but Pi exposes native undo through the host editor rather than a Vim-style undo tree API. Full Vim parity would have meant inventing a separate undo tree across every edit path, while the requirement was narrower: restore the latest prompt text/cursor state undone by normal-mode `u`.

Session-history search found no directly relevant prior sessions for this exact redo implementation. Related existing learnings point to the same architectural rule: keep parser/modal semantics finite and keep `VimEditor` as the thin Pi adapter that owns host-editor interactions.

## Guidance

Model redo as a prompt-local, linear adapter concern:

1. Expose `redo` as a finite semantic command in the keymap.
2. Let the modal engine emit an adapter intent for redo, just like undo.
3. Keep redo snapshots in `VimEditor`, because only the adapter can call Pi native undo and inspect resulting prompt text/cursor.
4. Clear redo only when a new text edit creates a different branch; cursor movement and modal side-effect changes should not destroy redo state.
5. Keep insert-mode `Ctrl-r` delegated to Pi so app-level shortcut behavior remains intact.

The command surface is ordinary keymap configuration:

```ts
export const DEFAULT_VIM_KEYMAP = Object.freeze({
  commands: Object.freeze({
    repeatChange: Object.freeze(["."]),
    undo: Object.freeze(["u"]),
    redo: Object.freeze(["ctrl+r"]),
  }),
});
```

The modal layer should not mutate prompt text for redo. It only translates parsed normal-mode input into an adapter-applied intent:

```ts
case "undo":
  return withEffects(nextState, [{ type: "adapterCommand", command: "undo" }]);
case "redo":
  return withEffects(nextState, [{ type: "adapterCommand", command: "redo" }]);
```

The adapter owns the linear redo stack and snapshots both text and cursor before native undo:

```ts
type RedoSnapshot = {
  text: string;
  cursor: Position;
};

export class VimEditor extends CustomEditor {
  private readonly redoStack: RedoSnapshot[] = [];

  private applyUndo(): void {
    const before = this.redoSnapshot();
    super.handleInput(KEY.undo);
    if (!sameRedoSnapshot(before, this.redoSnapshot())) this.redoStack.push(before);
  }

  private applyRedo(): void {
    const snapshot = this.redoStack.pop();
    if (!snapshot) {
      this.invalidate();
      return;
    }
    this.setText(snapshot.text);
    this.restoreCursor(snapshot.cursor);
    this.invalidate();
  }
}
```

Branch clearing stays conservative and text-based:

```ts
private applyEffect(effect: ModalEffect): void {
  switch (effect.type) {
    case "delegate": {
      const before = this.redoSnapshot();
      super.handleInput(effect.input);
      this.clearRedoAfterTextChange(before);
      return;
    }
    case "edit":
      this.applyEdit(effect.result);
      if (effect.result.changed) this.clearRedoStack();
      return;
  }
}

private clearRedoAfterTextChange(before: RedoSnapshot): void {
  if (this.getText() !== before.text) this.clearRedoStack();
}
```

## Why This Matters

Redo looks like a small keybinding, but its state boundary is different from parser, buffer, and modal edits. The modal engine has a snapshot of the current prompt, but it cannot know what Pi native undo will do. Putting redo state inside modal logic would either duplicate Pi undo semantics or guess at host-editor behavior.

Keeping redo in `VimEditor` preserves the existing architecture:

- `src/config.ts` and `src/commands.ts` own finite semantic key resolution.
- `src/modal/engine.ts` owns Vim-mode intent and side effects.
- `src/vim-editor.ts` owns Pi runtime calls, prompt restoration, and adapter-only state.
- User docs describe the bounded contract rather than promising full Vim undo-tree parity.

The result is intentionally narrower than Vim:

- normal-mode `Ctrl-r` restores the latest text/cursor state undone by normal-mode `u`
- redo is a safe no-op without redo state
- cursor movement preserves redo state
- a new text edit clears the redo branch
- redo does not restore unrelated extension-local side effects like cleared search highlights
- no Vim undo tree, redo counts, `:redo`, `g-`, or `g+`

## When to Apply

- Use this pattern when host-editor state changes can only be observed after delegating to Pi.
- Use adapter snapshots for host-driven changes such as native undo/redo boundaries.
- Keep pure modal/buffer helpers for deterministic prompt transformations that do not need host-editor delegation.
- Add live `VimEditor` tests whenever a new keymap/config field must survive option cloning into the runtime adapter.

## Examples

Lock the behavior at four seams:

```ts
expect(resolveNormalCommand("ctrl+r", undefined)).toEqual({
  type: "command",
  command: "redo",
});
```

```ts
const update = handleModalInput({ mode: "normal" }, snapshot, options, "\x12");
expect(update.effects).toEqual([{ type: "adapterCommand", command: "redo" }]);
```

```ts
test("normal mode redo restores undone prompt edit and can be undone again", () => {
  const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
  editor.setText("abc");
  typeKeys(editor, ["g", "g", "l", "x"]);
  editor.handleInput("u");
  editor.handleInput("\x12");
  expectEditorState(editor, { text: "abc", cursor: { line: 0, col: 1 }, mode: "normal" });
});
```

Also test negative boundaries:

- redo without state invalidates/rerenders but does not edit
- movement before redo preserves redo state
- successful text edit clears redo state
- insert-mode `Ctrl-r` delegates instead of invoking Vim redo
- configured redo key survives live editor keymap cloning
- redo does not resurrect cleared search highlights or overwrite registers, marks, macros, or dot-repeat state

Validation used for the implementation:

```bash
bun test
bun run check-types
bun run lint
bun run format:check
openspec validate --specs --strict
```

## Related

- [Vim behavior contracts drifted from live adapter behavior](../logic-errors/vim-behavior-contract-drift-2026-05-28.md) — moderate overlap on live `VimEditor` option cloning and adapter-level tests; distinct root cause and solution.
- [Finite Vim keybinding parser with pure buffer helpers](./finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md) — related finite command/keymap architecture.
- [Prompt buffer operation API for Vim editor adapters](./pi-vimmode-prompt-buffer-operation-api-2026-05-27.md) — related rule for keeping deterministic prompt operations in pure helpers.
- [Pi vimmode finite Ex line commands architecture](./pi-vimmode-finite-ex-line-commands-architecture-2026-06-01.md) — related parser/buffer/modal separation for finite Vim surfaces.
- [Pi Vim mode UI config as single source of truth](../tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md) — related keymap/config single-source guidance.

GitHub issue search for `pi-vimmode redo ctrl-r undo` returned no directly related issues.
