## Context

pi-vimmode already has a finite Ex command parser and a focused `src/modal/ex-command-line.ts` executor for prompt-local commands. Common editing Ex commands exist, but `:q` still fails even though Pi exposes graceful shutdown through `ExtensionContext.shutdown()`.

This change should add one Pi-lifecycle command, not a file/window command family. `:messages`, `:help`, `:features`, diagnostics, line commands, substitutions, and prompt transforms already cover useful prompt-local Ex work. Commands like `:write`, `:wq`, `:q!`, `:qa`, `:edit`, `:shell`, buffers, windows, and tabs have no prompt-local Pi target.

## Goals / Non-Goals

**Goals:**

- Support exact finite aliases `:q` and `:quit` from Ex command-line mode.
- Request graceful Pi shutdown through `ExtensionContext.shutdown()`.
- Keep prompt text, registers, marks, search state, macros, cursor, and dot-repeat untouched before shutdown.
- Keep parser behavior explicit and testable.
- Document supported quit behavior and deferred common Ex commands.

**Non-Goals:**

- No full Vimscript or arbitrary Ex abbreviation expansion.
- No `:q!`, `:w`, `:write`, `:wq`, `:x`, `:qa`, file/window/tab/buffer/shell commands.
- No direct `process.exit`.
- No new settings or dependencies.

## Decisions

1. Add `quit` as a typed Ex parse result.
   - Seams: `src/ex.ts`, `test/ex.test.ts`.
   - Approach: extend the finite command-name set with `q` and `quit`, returning `{ type: "quit", command: "q" | "quit" }`.
   - Alternatives rejected:
     - Treat `q` as generic unsupported command and special-case in modal code: splits grammar from execution.
     - Add Vim-style abbreviation expansion: expands scope and risks accepting commands this project does not implement.

2. Add a semantic modal shutdown effect instead of delegating a key or exiting process.
   - Seams: `src/modal/types.ts`, `src/modal/ex-command-line.ts`, `src/vim-editor.ts`, `src/lifecycle.ts`.
   - Approach: introduce a narrow `ModalEffect` such as `{ type: "shutdown" }`; `VimEditor` applies it by calling an injected shutdown callback wired from `ExtensionContext.shutdown()` in lifecycle.
   - Alternatives rejected:
     - Delegate `Ctrl-D`: Pi binds `app.exit` to `Ctrl-D` only when editor is empty, so non-empty prompts could delete text or do the wrong thing.
     - Call `process.exit`: bypasses Pi session shutdown handlers and extension cleanup.
     - Register `/quit` command and synthesize slash input: mutates prompt text path and couples Ex to command text.

3. Finish Ex input state before requesting shutdown.
   - Seams: `src/modal/ex-command-line.ts`, modal tests.
   - Approach: clear pending Ex state and normalize to normal mode, then emit shutdown effect; do not edit prompt text or write Ex success messages solely for a command whose visible outcome is app exit.
   - Alternatives rejected:
     - Leave pending Ex active until shutdown: harder to test and unsafe if shutdown is mocked or canceled.
     - Record quit in Ex history: not useful after exit and adds avoidable state mutation.

4. Keep explored command surface as docs, not code.
   - Seams: `docs/features.md`, runtime help if it lists Ex commands, docs drift tests if present.
   - Approach: document `:q`/`:quit` and a short "not supported" list for file/window/shell Ex commands.
   - Alternatives rejected:
     - Add aliases like `:q!`, `:wq`, or `:x` as no-ops: familiar names would imply save/dirty-buffer semantics Pi does not have.
     - Add `:clear`: duplicate of existing `:%delete`/line command semantics and not requested.

## Risks / Trade-offs

- Shutdown callback not available in tests or custom editor construction → default to a no-op spyable callback in tests, wire real callback in lifecycle, and cover live `VimEditor` construction.
- `ExtensionContext` can change across sessions → lifecycle should keep latest context callback when installing editor and avoid stale direct context storage where possible.
- Users may expect `:q!` → reject explicitly and document that force/file semantics are out of scope.
- Shutdown during visual Ex source mode could hide state bugs → modal tests should cover visual-source `:q` preserving prompt text and emitting only shutdown/invalidate-safe effects.

## Migration Plan

1. Extend parser/types and modal shutdown effect.
2. Wire `ExtensionContext.shutdown()` through lifecycle to `VimEditor`.
3. Add parser, modal, and adapter tests.
4. Update docs/runtime help references.
5. Run validation commands.

Rollback: remove `q`/`quit` parse entries, shutdown effect wiring, docs, and tests. Existing Ex command behavior remains unaffected.

## Open Questions

None.
