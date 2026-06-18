## Why

Insert-mode typing currently routes every keystroke through the full modal engine snapshot path even when the input is plain text that Pi's default editor can already handle. This creates avoidable work on long prompts while the desired user behavior remains ordinary insert-mode delegation.

## What Changes

- Add a guarded insert-mode fast path that delegates safe plain-text insert input directly to Pi's default editor behavior without constructing the full modal snapshot.
- Define the fast path as a positive allowlist: insert mode, plain text input, and no modal or adapter-owned side state that requires modal-engine handling.
- Preserve existing insert-mode semantics for `Esc`, autocomplete, Pi shortcuts, macro recording/playback, redo clearing, transient Ex message clearing, block insert, pending Ex/search state, and search highlight clearing.
- Add focused modal predicate tests and live `VimEditor` regression tests for the side effects the fast path could otherwise bypass.
- Add a reproducible local measurement artifact that splits full insert handling, snapshot construction, modal delegate overhead, and default editor insertion without adding brittle CI timing thresholds.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-editor-adapter-architecture`: Add requirements for a behavior-preserving guarded insert-mode delegation fast path at the `VimEditor` adapter/modal boundary.

## Impact

- Affected code seams: `src/vim-editor.ts`, `src/modal/engine.ts`, and modal helper/types modules.
- Tests: focused modal predicate tests and real `VimEditor` regression tests for normal typing, unsafe-state fallback, macro recording/replay, transient Ex messages, redo clearing, and search highlight expectations.
- Docs: no user-facing Vim behavior docs expected because behavior is preserved; benchmark or maintainer notes may document the local measurement command if added.
- Dependencies: no new runtime dependencies expected.
- Compatibility: no breaking changes. Insert-mode text, Pi shortcuts, autocomplete, and macro behavior must remain user-compatible.

## Non-goals

- Do not change npm publish/package verification scope; uploaded package behavior is already correct and out of scope for this change.
- Do not implement full Vim/Neovim parity, Vimscript, recursive mappings, `.vimrc`, or Neovim Lua support.
- Do not refactor config clone helpers, data-driven keymap tables, runtime docs metadata, buffer word helpers, or compiled keymap caches in this change.
- Do not add CI performance thresholds; benchmark output is local evidence, not a flaky gate.
