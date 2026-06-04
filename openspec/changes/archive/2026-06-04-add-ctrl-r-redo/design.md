## Context

pi-vimmode currently treats `u` as a normal-mode command that delegates to Pi's editor undo path through `VimEditor` and `CustomEditor`. The upstream Pi/TUI editor exposes undo via the `tui.editor.undo` keybinding, but the public docs do not expose a matching redo keybinding. Because most pi-vimmode text mutations already flow through `CustomEditor.setText`, Pi's undo stack remains the source of truth for prompt text history.

`Ctrl+R` is a Vim-native redo binding and appears in `TODOS.md` as the next feature candidate. The implementation must preserve pi-vimmode's boundary: practical prompt editing, not Vim undo-tree parity.

## Goals / Non-Goals

**Goals:**

- Add normal-mode `Ctrl+R` as redo for the most recent successful normal-mode `u` undo.
- Keep redo prompt-local: restore text and cursor only for the active prompt editor.
- Keep undo powered by Pi's existing editor undo path.
- Make redo a semantic command in `piVimMode.keymap.commands`, defaulting to `ctrl+r`.
- Preserve insert-mode Pi delegation and protected shortcut behavior outside explicitly owned normal-mode redo.
- Document behavior and limitations in canonical feature/settings docs.

**Non-Goals:**

- No Vim undo tree, branching redo history, persisted undo, redo counts, `:redo`, `g-`, or `g+`.
- No attempt to rewind registers, marks, macro state, dot-repeat state, Ex messages, or search history.
- No dependency or Pi core change.

## Decisions

### 1. Implement redo as a thin `VimEditor` redo shim around Pi undo

**Target seams:** `src/vim-editor.ts`, `src/modal/types.ts`, `src/modal/engine.ts`.

When normal-mode undo is executed, `VimEditor` captures the pre-undo text/cursor snapshot, delegates to Pi undo, then compares the post-undo snapshot. If undo changed text or cursor, the pre-undo snapshot is pushed onto an extension-local redo stack. When redo executes, `VimEditor` pops that snapshot, restores text through the existing editor mutation path, restores cursor, and leaves mode in normal.

**Alternatives rejected:**

- Delegate `Ctrl+R` directly to `CustomEditor`: rejected because Pi's documented editor keybindings expose undo but not redo.
- Replace Pi undo with a full extension-local undo/redo model: rejected as broader, riskier, and likely to drift from Pi editor history semantics.
- Make redo safe no-op until Pi adds redo: rejected because the user-facing feature would not work.

### 2. Clear redo only on successful non-undo text mutations

**Target seams:** `src/vim-editor.ts`, modal effect application.

The redo stack should survive movements, mode changes, pending-key invalidation, register selection, search navigation, and failed no-op edits. It should clear when an insert-mode delegated input, normal/visual/edit effect, paste, Ex edit, macro replay, or redo restoration creates a new text history branch.

**Alternatives rejected:**

- Clear redo on every key after undo: too strict; normal Vim lets users move before redo in common workflows.
- Never clear redo: incorrect after new edits because redo would restore stale branch state.

### 3. Treat redo as a finite semantic command

**Target seams:** `src/types.ts`, `src/config.ts`, `src/commands.ts`, tests.

Add `redo` beside `undo` in `VimCommandAction`, default keymap commands, clone/copy helpers, key sequence matching, validation warnings, and docs. This keeps custom keymap behavior consistent with existing command actions and avoids hard-coding `Ctrl+R` directly in the modal engine.

**Alternatives rejected:**

- Hard-code `Ctrl+R` in normal-mode handling: rejected because user-configurable keymap already owns finite command mappings.
- Add a new option family for undo/redo behavior: unnecessary; redo is just another command action.

### 4. Limit side effects to text, cursor, mode, and Pi delegation

**Target seams:** `src/modal/engine.ts`, `src/vim-editor.ts`, tests.

Redo should not write unnamed/named registers, marks, macro state, dot-repeat state, or Ex messages. If visual mode or pending state exists, normal command resolution should clear it consistently with existing command handling before adapter redo. Search highlights should follow the current undo behavior; if implementation discovers stale highlights after text restoration, clear invalid highlights rather than trying to recalculate unrelated search state.

**Alternatives rejected:**

- Snapshot and restore all modal state: rejected because current undo does not promise that and would create hidden coupling across registers, marks, macros, Ex, and search.

## Risks / Trade-offs

- **Pi editor internals may change undo behavior** → Keep shim isolated in `VimEditor`; test through public editor behavior where possible and avoid importing private Pi/TUI modules.
- **Restoring redo via `setText` can push an undo snapshot** → Treat this as desirable so `u` can undo a redo; cover with live editor tests.
- **New edit branch detection can miss delegated mutations** → Compare pre/post text snapshots around effect application and clear redo only when text actually changes outside undo/redo.
- **`Ctrl+R` may overlap an app-level shortcut in some Pi surface** → Own it only as a normal-mode pi-vimmode command; insert mode and non-editor surfaces continue through Pi defaults.
- **Search highlights can become stale after undo/redo** → Match current undo semantics or clear invalid highlights; do not attempt broad search recomputation in this change.

## Migration Plan

1. Add `redo` to semantic command types/config defaults without changing persisted settings.
2. Add modal handling that emits an adapter redo command in normal mode.
3. Add `VimEditor` redo stack behavior around existing Pi undo delegation.
4. Update feature and settings docs.
5. Validate with tests and OpenSpec strict validation.

Rollback is removing the `redo` command/default binding and deleting the adapter redo stack code; no persisted migration is required.

## Open Questions

- None blocking. During implementation, confirm whether the current Pi/TUI version gained an official redo keybinding; if it did, prefer direct adapter delegation and keep the local shim only if tests prove it is still needed.
