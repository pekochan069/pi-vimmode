## 1. Parser / Types / Config

- [ ] 1.1 Add `redo` to command/action types and adapter command typing beside existing `undo`.
- [ ] 1.2 Add default `piVimMode.keymap.commands.redo` binding to `ctrl+r` and preserve field-by-field clone/copy behavior for live `VimEditor` construction.
- [ ] 1.3 Add command/config tests for default redo mapping, configured redo mapping, invalid redo binding fallback, conflict warnings, and protected shortcut rejection.

## 2. Modal Integration

- [ ] 2.1 Add modal tests proving normal-mode redo resolves through the semantic keymap, clears pending counts/operators safely, and emits a redo adapter command without changing registers, marks, dot-repeat state, or prompt text directly.
- [ ] 2.2 Implement normal-mode redo command handling in `src/modal/engine.ts` using the same finite command path as undo.
- [ ] 2.3 Add regression tests that insert-mode `Ctrl+R` delegates to Pi behavior and existing normal-mode `u` behavior is unchanged.

## 3. Adapter / Live Editor Redo

- [ ] 3.1 Confirm whether the current Pi/TUI editor exposes an official redo keybinding or method; use direct delegation only if tests prove it works, otherwise use the local `VimEditor` redo shim from `design.md`.
- [ ] 3.2 Add live `VimEditor` tests for undo then redo restoring text/cursor, redo with no state as a no-op, movement before redo preserving redo state, and new text edits clearing redo state.
- [ ] 3.3 Implement redo state in `src/vim-editor.ts`: capture pre-undo snapshots, push redo only when undo changes text/cursor, clear redo on successful non-undo text mutations, and restore redo snapshots through the existing editor mutation/cursor restoration path.
- [ ] 3.4 Add regression tests that redo does not write unnamed/named registers, marks, macro state, dot-repeat state, or stale search highlights beyond current undo semantics.
- [ ] 3.5 Add a live editor test proving `u` can undo a redo restoration.

## 4. Docs / Roadmap

- [ ] 4.1 Update `docs/features.md` with normal-mode `Ctrl+R` redo behavior, safe no-op behavior, branch-clearing behavior, and non-goals such as no Vim undo tree.
- [ ] 4.2 Update `docs/settings.md` with `piVimMode.keymap.commands.redo`, default `ctrl+r`, configurable examples, and normal-mode shortcut ownership.
- [ ] 4.3 Mark the `TODOS.md` `ctrl+r (redo)` item complete after implementation and validation pass.

## 5. Validation

- [ ] 5.1 Run `bun test`.
- [ ] 5.2 Run `bun run check-types`.
- [ ] 5.3 Run `bun run lint`.
- [ ] 5.4 Run `bun run format:check`.
- [ ] 5.5 Run `openspec validate --specs --strict`.
