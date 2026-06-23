## 1. Parser and Types

- [x] 1.1 Add `q` and `quit` to the finite Ex command parser in `src/ex.ts` with a typed `quit` parse result.
- [x] 1.2 Add `ModalEffect` support for a semantic shutdown request in `src/modal/types.ts`.
- [x] 1.3 Add parser tests covering `:q`, `:quit`, `:'<,'>q`, and rejected `:q!`, `:quit!`, `:wq`, `:x`, and `:qa`.

## 2. Modal Execution

- [x] 2.1 Execute parsed quit commands in `src/modal/ex-command-line.ts` by clearing pending Ex state and emitting the shutdown effect without editing prompt text.
- [x] 2.2 Add modal tests proving `:q` and `:quit` emit shutdown, leave prompt text unchanged, and do not mutate registers, marks, search state, macro state, cursor, or dot-repeat.
- [x] 2.3 Add visual-source modal coverage for `:'<,'>q` proving shutdown is requested without prompt-buffer or editing-state side effects.

## 3. Adapter and Lifecycle Wiring

- [x] 3.1 Thread an optional shutdown callback from `registerVimLifecycle` to `VimEditor`, wired to `ExtensionContext.shutdown()`.
- [x] 3.2 Apply the shutdown modal effect in `VimEditor` through the injected callback, not `Ctrl-D`, slash-command text, or `process.exit`.
- [x] 3.3 Add live editor/lifecycle tests proving the shutdown callback is wired and custom/test construction remains safe.

## 4. Documentation

- [x] 4.1 Update `docs/features.md` to document `:q` and `:quit` as Pi shutdown commands.
- [x] 4.2 Update runtime help or command catalog docs if they list supported Ex commands.
- [x] 4.3 Document intentionally unsupported file/window/shell commands: `:write`, `:wq`, `:q!`, `:qa`, `:x`, and `:shell`.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate add-common-ex-commands --type change --strict`.
- [x] 5.6 Run `openspec validate --specs --strict`.
