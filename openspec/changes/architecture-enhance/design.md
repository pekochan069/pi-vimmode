## Context

Architecture review accepted a narrow behavior-preserving architecture pass for pi-vimmode. Current duplication sits in four places: keymap grammar rules split between runtime and diagnostics, prompt transform metadata split between registry and customization diagnostics, runtime help drift anchors split between runtime registry and test support, and visual selection semantics spread through buffer/modal/range/render code.

This change keeps product scope unchanged: practical Pi prompt editing, finite Vim-like behavior, no full Vim/Neovim parity, no new settings, no runtime dependencies. Workbench seam deletion is explicitly deferred.

## Goals / Non-Goals

**Goals:**

- One internal source for finite keymap binding enumeration and exact/prefix conflict checks.
- Customization diagnostics consume canonical prompt transform action registry metadata.
- Runtime help registry owns its drift anchors for docs/spec/test validation.
- Visual selection semantics move into a focused pure seam while preserving all current user-facing behavior.
- Each refactor ships with one small runnable check that fails on behavior drift.

**Non-Goals:**

- No public keymap API, recursive mappings, timeout behavior, Vimscript, Neovim Lua, or plugin dispatch.
- No docs table generation for prompt transform actions.
- No broad migration of all docs drift metadata.
- No change to Ex visual range prefill; `'<,'>` stays line-oriented.
- No workbench deletion in this change.

## Decisions

### 1. Keep keymap grammar helpers internal

Target seams: `src/commands.ts`, `src/config.ts`, `src/keymap-descriptors.ts`.

Create or reuse the smallest internal module that can enumerate resolved grammar bindings and answer exact/prefix conflict questions. Runtime compilation and settings diagnostics call that shared logic; public types stay unchanged.

Alternatives considered:

- Leave duplicated grammar walks in place. Rejected: diagnostics can drift from runtime dispatch.
- Expose a public keymap grammar API. Rejected: no external consumer and adds surface area.
- Replace the full resolver. Rejected: broader risk than needed.

### 2. Make prompt transform diagnostics registry-backed

Target seams: `src/prompt-transform-actions.ts`, `src/customization.ts`.

Diagnostics should look up action IDs, descriptions, args, and enabled state from the existing prompt transform action registry. Extend registry metadata only if a diagnostic needs a fact that has no canonical home yet.

Alternatives considered:

- Keep diagnostics-specific descriptions. Rejected: duplicate source of truth.
- Generate docs/settings tables now. Rejected: explicitly out of scope.
- Merge diagnostic/help metadata into bindable transform actions. Rejected: weakens metadata-only boundary.

### 3. Co-locate runtime help drift anchors with runtime help entries

Target seams: `src/runtime-help.ts`, `test/support/runtime-docs-metadata.ts`, `test/docs-drift.test.ts`.

Add registry-owned docs/spec/test anchors to runtime help entries or explicit registry-owned exceptions. Drift tests read runtime help entry IDs and anchors from `src/runtime-help.ts` instead of joining to a separate test-support table.

Alternatives considered:

- Keep test-support anchor table. Rejected: source-backed runtime help still has split ownership.
- Move every docs drift anchor in one pass. Rejected: too broad; only runtime help anchors move now.

### 4. Extract visual-selection semantics only

Target seams: `src/buffer.ts`, `src/modal/visual.ts`, `src/range.ts`, `src/modal/ex-command-line.ts`, renderer callers.

Move visual range normalization, selected text, visual edit targets, and visual summaries into a pure visual-selection seam. Keep prompt buffer as general text primitive layer and keep compatibility wrappers where that avoids churn. Preserve side effects: registers, marks, dot-repeat, search highlights, macro recording/replay, visual state, Ex messages, cursor placement, and Pi delegation.

Alternatives considered:

- Rewrite visual mode behavior. Rejected: user-facing behavior should not change.
- Move all prompt buffer visual callers at once with no wrappers. Rejected: bigger diff, harder rollback.
- Add character/block Ex range semantics. Rejected: out of scope; existing `'<,'>` marker stays line-oriented.

### 5. Defer workbench seam deletion

Target seams: `src/modal/workbench.ts`, Ex/search pending state.

Do not delete or redesign workbench in this change. Architecture review flagged it, but current decision is defer until user reopens that scope.

Alternatives considered:

- Delete workbench first because the report ranked it highest. Rejected: current handoff decision says defer.

## Risks / Trade-offs

- Keymap helper changes could alter dispatch precedence → add equivalence tests for default/configured keymaps, exact conflicts, prefix conflicts, shared prefixes, and protected shortcuts.
- Registry-backed diagnostics could omit a description or disabled-state nuance → add diagnostics tests around `:actions`, `:features`, `:keymap`, `:mapcheck`, and `:vimdoctor` for prompt transforms.
- Runtime help anchor move could weaken drift validation → keep tests failing on missing docs/spec/test anchors and delete only the duplicated test-support anchor source after parity is proven.
- Visual extraction could subtly change selection side effects → add focused tests for range normalization, selected text, edit targets, summaries, render mapping, modal operations, and Ex prefill compatibility.
- New modules could create import cycles or over-splitting → keep seams pure, internal, and as small as shared callers require.

## Migration Plan

1. Implement keymap grammar helper extraction and equivalence tests.
2. Wire customization diagnostics to prompt transform registry metadata and remove duplicate diagnostic descriptions.
3. Move runtime help drift anchors into the runtime help registry and update docs drift tests.
4. Extract visual-selection semantics behind a pure seam, preserving compatibility wrappers where smallest.
5. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.
6. Rollback by reverting the latest step; each step should be behavior-preserving and independently testable.

## Open Questions

None blocking. Exact helper filenames should be chosen during implementation by smallest diff and lowest import-cycle risk.
