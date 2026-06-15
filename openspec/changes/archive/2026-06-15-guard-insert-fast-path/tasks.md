## 1. Fast-Path Predicate

- [x] 1.1 Add a pure modal helper such as `canFastDelegateInsertInput(state, data, context)` using a positive allowlist for safe insert-mode plain text.
- [x] 1.2 Add a narrow context type for adapter-owned guard facts such as macro replay and autocomplete/open-completion state if implementation needs them.
- [x] 1.3 Add focused unit tests covering safe insert text and unsafe fallbacks for non-insert mode, `Esc`, control/navigation input, multi-key or paste-like input, help popup, pending Ex, pending search, block insert, transient Ex message, macro recording, macro replay, and search render/highlight state.

## 2. VimEditor Integration

- [x] 2.1 Wire `VimEditor.handleInput` to check the fast-path helper before constructing the full `EditorSnapshot`.
- [x] 2.2 Implement direct Pi default-editor delegation for fast-path input while preserving redo snapshot and redo clearing behavior.
- [x] 2.3 Keep all unsafe input on the existing `handleModalInput(this.modalState, this.snapshot(), ...)` path.

## 3. Real-Editor Regression Tests

- [x] 3.1 Add a live `VimEditor` test proving ordinary insert text uses the fast path and still inserts exactly like default Pi editing.
- [x] 3.2 Add live tests proving `Esc` remains modal-owned and exits insert mode as before.
- [x] 3.3 Add live tests proving macro recording captures insert text and macro replay inserts text through the existing modal semantics.
- [x] 3.4 Add a live test proving transient Ex messages clear with existing behavior while the typed insert text is preserved.
- [x] 3.5 Add a live test proving direct fast-path text insertion clears redo history after a text change.
- [x] 3.6 Add a focused test for search-highlight/search-render state to prove behavior remains unchanged and unsafe state falls back to the modal path.

## 4. Measurement Artifact

- [x] 4.1 Add a reproducible local measurement command or script with a fixed long prompt and fixed iteration count.
- [x] 4.2 Measure or report separate costs for full `handleInput`, snapshot construction, modal delegate routing, and default editor insertion where feasible.
- [x] 4.3 Document that the measurement is local evidence only and does not create a CI timing threshold.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate --specs --strict`.
