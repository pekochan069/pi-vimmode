## Context

`piVimMode.keymap.insert` currently accepts only opt-in `openLineBelow` and `openLineAbove` bindings. Insert mode otherwise delegates normal text, autocomplete, and unconfigured Pi shortcuts to Pi. Approved design source: `/home/thinline20/.gstack/projects/pekochan069-pi-vimmode/thinline20-main-design-20260623-164748.md`.

Existing seams already fit the change:

- `src/types.ts` defines public/resolved insert keymap shape.
- `src/keymap-descriptors.ts` contains insert action descriptors with empty defaults.
- `src/config.ts` validates `piVimMode.keymap.insert`, rejects raw printable sequences, detects duplicates, and clones resolved keymap options.
- `src/modal/engine.ts` handles insert-mode keys after escape/autocomplete delegation and before final Pi delegation.
- `src/buffer.ts` already owns small-word and line-boundary helpers; normal delete helpers return registers and must not be reused directly for insert deletes.

## Goals / Non-Goals

**Goals:**

- Add finite insert actions: `deleteWordBackward`, `deleteWordForward`, `deleteLineBackward`, `deleteLineForward`, `moveWordBackward`, `moveWordForward`, `moveLineStart`, and `moveLineEnd`.
- Keep all insert actions opt-in with empty defaults.
- Reuse existing small-word semantics for insert word movement/deletion.
- Preserve Pi ownership of normal typing, autocomplete-active input, and unconfigured/protected shortcuts.
- Keep insert delete actions register-free.
- Document readline-style and home-row-mod examples separately.

**Non-Goals:**

- Raw printable mappings such as `jk`, `jj`, or `oo`.
- Multi-key insert sequences, insert abbreviations, recursive mappings, `.vimrc`, Vimscript, Neovim Lua, or runtime `:map`.
- Prompt transforms under `piVimMode.keymap.insert`; they stay under `piVimMode.keymap.actions`.
- Insert presets, macro semantics, dot-repeat semantics, visual-state changes, or full Vim/Neovim parity.

## Decisions

### Extend the existing insert keymap surface, not a new resolver

Target seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/config.ts`, `src/modal/engine.ts`.

- Decision: add actions to `VimInsertKeymapOptions` / `ResolvedVimInsertKeymap`, descriptor/default records, `INSERT_ACTION_SET`, clone/merge paths, and the existing insert dispatch branch.
- Alternative rejected: create a second insert-mode grammar or reuse normal-mode command resolution. That would add prefix/mapping behavior this feature explicitly avoids.
- Rationale: current insert dispatch already gates autocomplete, escape aliases, configured insert actions, then Pi delegation. Extending it is the smallest safe seam.

### Add pure insert-safe buffer helpers

Target seam: `src/buffer.ts`.

- Decision: expose narrow helpers for insert word/line movement and deletion that return cursor targets or `EditResult` without `register`.
- Alternative rejected: call `deleteRange`, `deleteByMotion`, or normal-mode delete helpers and strip registers later. That hides the side effect and risks register bleed through `editStateAndEffects()`.
- Rationale: insert deletes are text edits, not Vim delete/yank operations. Register absence belongs in the helper contract.

### Reuse small-word semantics exactly

Target seam: existing `wordForwardPosition()` and `wordBackwardPosition()` behavior.

- Decision: insert word movement/deletion uses existing lowercase Vim small-word boundary model: keyword runs, punctuation runs, and whitespace as separate groups.
- Alternative rejected: readline shell word semantics or whitespace-only WORD semantics. Those would diverge from project-local Vim motion behavior and require more docs/tests.
- Rationale: one boundary model avoids duplicate edge-case logic.

### Preserve insert delegation and shortcut safety

Target seams: `parseInsertBindings()`, `handleInsertInput()`, `canFastDelegateInsertInput()`.

- Decision: accepted insert bindings remain modified or protected-single-key chords; raw printable sequences stay rejected; protected keys require same-layer `allowProtectedOverrides`; autocomplete-open input delegates before any insert action dispatch.
- Alternative rejected: allow raw `jk`/`jj`/`oo` or default readline bindings. That steals normal typing/Pi behavior.
- Rationale: safe prompt editing beats nostalgic mappings.

### Keep side effects explicit

Target seams: `src/modal/engine.ts`, `src/modal/core.ts`, `src/vim-editor.ts` effect application.

- Decision: cursor-only actions emit restore-cursor/invalidate effects and preserve search highlights; mutating insert edits use the existing edit path so changed text clears search highlight consistently. Insert actions do not change registers, marks, visual state, macros, dot-repeat state, or prompt transform state.
- Alternative rejected: send cursor movement through synthetic Pi input or normal-mode motion state. That would make side effects unclear and harder to test.
- Rationale: insert actions are prompt-local physical edits only.

## Risks / Trade-offs

- Register bleed → Add tests proving insert deletes leave unnamed/named registers unchanged; avoid normal delete helpers that populate `EditResult.register`.
- `deleteLineForward` at EOL trims spaces by accident → Implement newline-only join at EOL and test spaces on both sides.
- `ctrl+k` docs conflict → Keep readline delete-line-forward and home-row open-line-above examples separate and name the conflict.
- Config propagation drift → Update types, descriptors, defaults, clone/merge paths, docs metadata, and live editor tests together.
- Scope creep into prompt transforms/presets → Keep tasks limited to finite insert actions; defer presets and semantic transforms.

## Migration Plan

1. Add types/descriptors/default empty arrays for new insert actions.
2. Extend config parsing/cloning/merging without adding defaults.
3. Add insert-safe buffer helpers and tests.
4. Extend insert dispatch in `src/modal/engine.ts`.
5. Update docs and release notes.
6. Run validation: `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, `openspec validate --specs --strict`.

Rollback: remove new action entries and dispatch cases. Existing `openLineBelow` / `openLineAbove` config remains unchanged because no defaults or migrations are introduced.

## Open Questions

None for this change. Preset names and future action-layer expansion stay deferred.
