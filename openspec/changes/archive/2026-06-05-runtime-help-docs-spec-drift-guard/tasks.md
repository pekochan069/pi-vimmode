## 1. Runtime Help Registry

- [x] 1.1 Add a pure runtime help/feature registry module with typed feature ids, categories, aliases/topics, examples, limits, docs anchors, spec anchors, and test anchors.
- [x] 1.2 Reuse existing customization/action/protected-shortcut metadata from `src/customization.ts` instead of duplicating keymap or shortcut catalogs.
- [x] 1.3 Add lookup helpers for `:help [topic]`, `:features [query]`, unsupported-topic fallback, and compact category summaries.
- [x] 1.4 Add focused registry tests for topic aliases, feature queries, unsupported queries, docs/spec/test anchor presence, and width-safe message text.
- [x] 1.5 Add effective-state tests for disabled macros, disabled/restricted marks, disabled or renamed prompt transforms, and search-highlight settings reflected in feature output.

## 2. Docs and Spec Drift Guard

- [x] 2.1 Add structured docs-anchor conventions or helpers so registry entries can be validated against `docs/features.md` without broad prose parsing.
- [x] 2.2 Add drift guard tests that fail when supported runtime commands from the registry or finite Ex command source lack required feature-doc anchors.
- [x] 2.3 Add regression tests that fail if user-facing docs claim `:noh` or `:nohlsearch` are unsupported while source support exists.
- [x] 2.4 Add settings-doc validation for documented `piVimMode` paths/defaults against available config/type metadata plus an explicit approved legacy/ignored list.
- [x] 2.5 Ensure the drift guard runs through `bun test` or a named package script that is included in the documented validation path.

## 3. Ex Parser and Modal Integration

- [x] 3.1 Extend `src/ex.ts` with finite parse results for exact `help`, `features`, and `messages` commands.
- [x] 3.2 Add Ex parser tests for `:help`, `:help <topic>`, `:features`, `:features <query>`, `:messages`, unsupported abbreviations, and rejected `:messages` arguments.
- [x] 3.3 Add modal execution branches in `src/modal/engine.ts` that call runtime help helpers and emit informational messages only.
- [x] 3.4 Add modal tests proving `:help`, `:features`, and `:messages` preserve prompt text, cursor, registers, marks, macro state, search highlights, visual state, and dot-repeat.
- [x] 3.5 Add visual Ex tests proving runtime help commands restore original visual mode, anchor, cursor, and highlight after the prefilled visual range marker is deleted.
- [x] 3.6 Add regression tests proving runtime help commands do not write unnamed/named registers, do not clear search highlights, and do not replace the previous dot-repeat change.

## 4. Message History, View, and Rendering

- [x] 4.1 Add capped runtime message history state and helpers that retain recent user-facing messages while excluding active Ex input and `:messages` output.
- [x] 4.2 Integrate message retention with existing Ex success/error/info messages and optional no-op feedback without changing default quiet behavior.
- [x] 4.3 Add tests for empty history, cap rollover, latest-message summary, repeated `:messages` not polluting history, and message clearing behavior.
- [x] 4.4 Update modal view/render integration so runtime help/messages use the existing one-row width-safe message surface and bounded prompt viewport.
- [x] 4.5 Add rendering/view tests for width truncation, viewport height, visual selection composition, search highlight composition, and cursor style preservation while messages are visible.

## 5. Documentation and Durable Policy

- [x] 5.1 Update `docs/features.md` with `:help [topic]`, `:features [query]`, and `:messages` examples, workflows, limitations, and source-of-truth notes.
- [x] 5.2 Update `docs/features.md` feature-discovery examples for supported queries such as `:features nohlsearch`, `:features redo`, and protected shortcut/help topics.
- [x] 5.3 Update `docs/settings.md` only where runtime help or drift guard metadata references setting-controlled behavior; keep settings keys/defaults aligned with config source.
- [x] 5.4 Add or update a compact ADR if the runtime help registry becomes a durable source-of-truth policy beyond existing docs/spec guidance.
- [x] 5.5 Cross-check docs against registry, OpenSpec specs, and tests so docs do not describe unsupported commands or omit supported runtime help commands.

## 6. Validation

- [x] 6.1 Run `bun test` and fix failures.
- [x] 6.2 Run `bun run check-types` and fix failures.
- [x] 6.3 Run `bun run lint` and fix failures.
- [x] 6.4 Run `bun run format:check` and fix failures.
- [x] 6.5 Run `openspec validate --specs --strict` and fix failures.
