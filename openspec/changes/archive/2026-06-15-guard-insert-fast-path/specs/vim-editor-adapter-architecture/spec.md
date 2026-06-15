## ADDED Requirements

### Requirement: Guarded insert-mode fast path preserves modal semantics

The Vim editor SHALL allow `VimEditor` to bypass full modal snapshot construction for safe ordinary insert-mode text input only when a positive allowlist proves that no modal or adapter-owned side effect is required.

#### Scenario: Safe insert text delegates without full modal routing

- **WHEN** the editor is in insert mode, no modal side state is active, no adapter-owned replay or autocomplete guard is active, and the input is classified as ordinary plain text insertion
- **THEN** the adapter may delegate the input through Pi's default editor insertion path without constructing the full modal snapshot or calling the full modal input router

#### Scenario: Escape remains modal-owned

- **WHEN** the editor is in insert mode and receives `Esc`
- **THEN** the input is handled through the modal path so the editor either enters normal mode or delegates to Pi when autocomplete behavior requires it

#### Scenario: Non-text input remains modal-owned

- **WHEN** the editor is in insert mode and receives control input, navigation input, submit input, paste-like multi-key input, terminal escape sequences, or any input not classified as ordinary plain text insertion
- **THEN** the input is handled through the modal path or Pi delegation effects already defined by the modal engine

#### Scenario: Pending modal state disables fast path

- **WHEN** insert mode has active block insert, pending Ex command-line input, pending search input, help popup state, transient Ex message state, or other modal state that changes how the next key is interpreted or rendered
- **THEN** the adapter MUST NOT use the fast path and MUST route the input through the modal engine

#### Scenario: Macro recording and replay disable fast path

- **WHEN** macro recording is active or macro replay is in progress
- **THEN** insert input is routed through the existing modal input path so recorded tokens, replay guards, and macro side effects remain identical to live modal behavior

#### Scenario: Direct delegation preserves redo semantics

- **WHEN** the fast path delegates ordinary insert text directly to Pi's default editor insertion path and the prompt text changes
- **THEN** the adapter clears redo history with the same behavior as an equivalent modal delegate effect

#### Scenario: Transient messages preserve existing behavior

- **WHEN** insert mode has a transient Ex message visible and the user types ordinary text
- **THEN** the input is routed through the modal path so the message-clearing behavior and inserted text match existing behavior

#### Scenario: Search highlight behavior is unchanged

- **WHEN** search highlight state or search rendering state is present while insert input is received
- **THEN** the adapter uses the modal/render-preserving path unless the fast-path predicate can prove the current search configuration requires no modal side effect

#### Scenario: Validation covers fast-path safety

- **WHEN** `bun test` is executed
- **THEN** tests cover the fast-path predicate, safe insert delegation, unsafe-state fallback, macro recording and replay, transient Ex message behavior, redo clearing, search highlight expectations, and `Esc` behavior through the real `VimEditor` adapter where adapter state can affect correctness
