## Context

`src/buffer.ts` already contains most pure text-editing primitives and Vim operation helpers. `src/vim-editor.ts` and `src/render.ts` still import low-level helpers, which keeps behavior split across adapter, rendering, and buffer layers. This change deepens `buffer.ts` into a prompt buffer operation module so text behavior lives where it can be unit-tested without Pi runtime concerns.

Current constraints:

- Preserve all existing Vim key behavior and cursor/register semantics.
- Avoid new dependencies.
- Keep Pi editor integration in `src/vim-editor.ts`.
- Keep display/highlight formatting in `src/render.ts`.

## Goals / Non-Goals

**Goals:**

- Define cohesive buffer operation APIs for navigation, visual selection/editing, linewise operations, operator-motion operations, and paste.
- Prefer operation-level tests in `test/buffer.test.ts` over broad adapter tests for pure prompt-editing behavior.
- Reduce direct use of low-level helpers outside `src/buffer.ts`.
- Preserve existing user-facing behavior and documented keymap.

**Non-Goals:**

- Add new Vim commands or change keybindings.
- Rewrite modal state management wholesale.
- Change Pi prompt editor APIs or rendering output beyond necessary call-site cleanup.
- Remove useful pure internals if they remain needed inside the buffer module.

## Decisions

### Operation API replaces helper composition at call sites

Expose prompt-buffer operations that return existing domain shapes (`Position`, `EditResult`, `VimRegister`, summaries/ranges) instead of forcing callers to compose low-level helpers. Navigation operations should cover buffer start/end, first non-blank, matching pair, and motion resolution. Editing operations should cover visual ranges, line ranges, operator-motion delete/yank/change, and paste before/after.

Rationale: call sites describe user intent, while buffer module owns text mechanics and edge cases.

Alternative considered: keep helpers exported and add more adapter tests. Rejected because behavior remains scattered and regressions require heavier integration tests.

### Keep low-level helpers private unless cross-module need is proven

`splitText`, `joinLines`, `clampPosition`, `comparePositions`, range normalization, and offset conversion are implementation details unless another module has a stable reason to depend on them. Rendering may keep a small selection/range surface if needed, but should not duplicate buffer semantics.

Rationale: smaller public surface makes future changes easier and clarifies module boundaries.

Alternative considered: create a separate `buffer-helpers.ts`. Rejected for this change because it keeps the helper pile rather than deepening the module.

### Tests target operation contracts

Update `test/buffer.test.ts` to cover operation-level contracts for navigation, visual operations, linewise operations, operator-motion operations, and paste. Keep adapter tests focused on Pi integration, mode dispatch, and delegated shortcuts.

Rationale: pure text behavior should be fast, deterministic, and independent of Pi runtime.

Alternative considered: snapshot current behavior through `VimEditor` only. Rejected because it obscures root cause when a text operation fails.

## Risks / Trade-offs

- Public helper removal may break tests or call sites unexpectedly → migrate call sites in small groups and run typecheck/tests after each group.
- Operation API could become too broad → group by prompt editing intent and avoid exposing generic helpers unless needed.
- Visual rendering still needs range data → keep rendering-facing API narrow and explicit.
- Cursor/register edge cases may regress during consolidation → add operation tests before or alongside call-site migration.

## Migration Plan

1. Inventory external imports from `src/buffer.ts`.
2. Add operation-level APIs around existing behavior without changing semantics.
3. Move `src/vim-editor.ts` and `src/render.ts` to operation-level calls.
4. Make low-level helpers private where possible.
5. Expand `test/buffer.test.ts` around operation contracts and run existing validation.
6. If a regression appears, rollback by restoring old helper exports while keeping tests that captured expected behavior.

## Open Questions

- Should rendering consume explicit visual highlight segments from `buffer.ts`, or only normalized ranges/summaries? Decide during implementation based on lowest coupling.
- Should operation grouping use one object namespace or named functions? Prefer named functions unless call sites show object grouping improves clarity.
