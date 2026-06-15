## Context

pi-vimmode resolves normal-mode keys through a finite semantic keymap (`src/types.ts`, `src/config.ts`, `src/commands.ts`) and routes motion behavior through a small modal seam (`src/modal/normal.ts`) plus pure prompt-buffer helpers (`src/buffer.ts`). Current `w`, `b`, and `e` are implemented as whitespace-delimited token movement in `src/buffer.ts`, so uppercase WORD motions should not silently change existing lowercase behavior in this change. The main gap is explicit Vim key vocabulary (`W`, `B`, `E`) and reverse word-end motions (`ge`, `gE`) that compose with counts, visual mode, and delete/change/yank operator ranges.

## Goals / Non-Goals

**Goals:**

- Add finite semantic motion actions for WORD and previous-end motions.
- Preserve existing lowercase `w`, `b`, and `e` behavior.
- Support normal-mode, visual-mode, and delete/change/yank operator-motion flows for the new motions.
- Keep all target resolution prompt-local, deterministic, count-aware, and safe when no target exists.
- Expose defaults and configurable motion names through `piVimMode.keymap.motions` and `piVimMode.keymap.operatorMotions`.
- Update tests, feature docs, settings docs, and OpenSpec specs together.

**Non-Goals:**

- No punctuation-aware retuning of lowercase word motions in this change.
- No subword, camelCase, snake_case, kebab-case, or language-aware token navigation.
- No new text objects, prompt-structure jumps, display-line motions, or jumplist.
- No recursive mappings, Vimscript, `.vimrc`, Neovim Lua, or full Vim/Neovim parity.

## Decisions

### Decision 1: Add new semantic motion actions instead of overloading existing word actions

Add motion action names `wordForwardBig`, `wordBackwardBig`, `wordEndBig`, `wordPreviousEnd`, and `wordPreviousEndBig` to `VimMotionAction`, `VIM_MOTION_ACTIONS`, `DEFAULT_VIM_KEYMAP.motions`, clone/merge paths, and docs metadata that enumerates motion actions.

- **Target seams:** `src/types.ts`, `src/config.ts`, `src/commands.ts`, settings docs, keymap tests.
- **Why:** Semantic keymap configuration needs stable action IDs for `W`, `B`, `E`, `ge`, and `gE`; aliasing these to existing `wordForward`/`wordBackward`/`wordEnd` would make diagnostics and `operatorMotions` unable to distinguish user intent.
- **Alternative rejected:** Treat `W`, `B`, and `E` as extra default keys for existing lowercase actions. This is simpler but prevents users from configuring WORD motions separately and makes future lowercase word-boundary refinement harder.

### Decision 2: Keep lowercase word boundaries unchanged and implement WORD as explicit whitespace-token helpers

Reuse the current whitespace-delimited behavior for WORD targets, but expose it through dedicated helper names. If future work makes lowercase `w`/`b`/`e` punctuation-aware, the WORD helper remains the stable whitespace-token implementation.

- **Target seams:** `src/buffer.ts`, `src/modal/normal.ts`, buffer tests.
- **Why:** Existing users may rely on current `w` crossing punctuation-heavy paths and URLs. This change should add missing keys and reverse-end behavior without breaking current motion feel.
- **Alternative rejected:** Retune lowercase `w`/`b`/`e` to strict Vim word semantics immediately. That would create a behavior migration unrelated to this change and require broader compatibility discussion.

### Decision 3: Extend pure buffer motion primitives before modal dispatch

Add pure cursor-target helpers for WORD forward/backward/end and previous word/WORD end. Extend operator motion range resolution to understand the new motion family without raw text splicing in modal code.

- **Target seams:** `src/buffer.ts`, existing `wordEndPosition`, `deleteByMotion`, `yankByMotion`, and any typed motion representation used between modal and buffer helpers.
- **Why:** Buffer helpers already own offset math, clamp behavior, register ranges, and linewise vs characterwise decisions. Keeping the new range math there preserves focused tests and keeps `src/modal/normal.ts` thin.
- **Alternative rejected:** Compute `ge`/`gE` ranges in `src/modal/normal.ts`. That would duplicate offset logic and increase risk around multiline positions and operator inclusivity.

### Decision 4: Let finite key sequence parsing handle `g`-prefixed motions through the semantic keymap

Bind `ge` and `gE` as normal motion sequences in `DEFAULT_VIM_KEYMAP.motions` and rely on the existing prefix matcher that already supports `gg` and configured multi-key sequences.

- **Target seams:** `src/commands.ts`, parser tests.
- **Why:** `resolveNormalCommand` already models finite multi-key motion prefixes and after-operator motion prefixes. Adding `ge`/`gE` as semantic motion bindings keeps the parser non-recursive and configurable.
- **Alternative rejected:** Add a bespoke `g` parser branch only for previous-end motions. That would bypass config and increase grammar special cases.

### Decision 5: Treat new motions as motion-capable operator targets by default

Include the new actions in the default `operatorMotions` matrix for `delete`, `change`, and `yank`, and validate configured matrices against the expanded motion action set.

- **Target seams:** `src/config.ts`, `src/commands.ts`, `src/modal/normal.ts`, modal/operator tests.
- **Side effects:** Delete/change write the unnamed character register; change enters insert mode only when text changes; yank does not mutate prompt text; invalid/missing targets leave registers, prompt text, mode, marks, search highlights, and visual state unchanged except for normal invalidation/no-op feedback.
- **Why:** Existing word motions compose with operators; users will expect `dW`, `cE`, `dge`, and `ygE` to work under the same finite rules.
- **Alternative rejected:** Support the motions only for cursor movement first. That would leave the most valuable Vim composition path missing.

### Decision 6: Update docs and validation at the same time as runtime behavior

Update `docs/features.md` for user examples and limitations, `docs/settings.md` for semantic action names/default bindings/operator-motion matrix, and tests that guard runtime and docs claims.

- **Target seams:** docs, documentation drift checks, OpenSpec validation.
- **Why:** The project treats docs/settings/runtime as shared source-of-truth surfaces. New configurable motion names are easy to document incorrectly if runtime and docs do not move together.
- **Alternative rejected:** Ship runtime first and update docs later. That would violate existing documentation drift policy.

## Risks / Trade-offs

- **Current lowercase word behavior already matches WORD-like whitespace tokens** → Mitigation: document that this change preserves lowercase behavior and adds explicit uppercase/action vocabulary; do not claim punctuation-aware lowercase parity.
- **New action names can drift from docs/settings examples** → Mitigation: add config tests for default bindings, custom bindings, invalid operator-motion names, and live `VimEditor` option propagation.
- **Operator ranges for backward end motions can be off by one** → Mitigation: add buffer-level tests for `ge`/`gE` from word starts, word middles, whitespace, prompt start/end, multiline text, and counted motions before modal integration.
- **`gE`/`ge` can conflict with existing `gg` prefix handling** → Mitigation: rely on the finite keymap prefix matcher and add parser tests for `g`, `gg`, `ge`, `gE`, configured multi-key bindings, and invalid `gX`.
- **Visual-mode behavior may diverge from normal-mode cursor movement** → Mitigation: route visual motion through the same semantic motion update path and add visual selection extension tests for each new motion family.

## Migration Plan

1. Add semantic motion action types/defaults and config cloning/validation support.
2. Add pure buffer helpers and focused unit tests for WORD and previous-end target resolution.
3. Wire semantic motions through normal and visual movement plus operator-motion delete/change/yank.
4. Add parser/keymap/modal/integration tests for default and configured bindings.
5. Update `docs/features.md`, `docs/settings.md`, and any runtime help/drift metadata that enumerates supported motions.
6. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback is straightforward: remove the new action IDs/default bindings/helpers/tests/docs from the change before release. No data migration, persistent state change, or dependency change is involved.

## Open Questions

- If runtime help metadata has a canonical motion registry separate from config, implementation should update it in the same patch; otherwise docs/settings coverage is sufficient.
