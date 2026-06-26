## Context

pi-vimmode routes normal-mode input through a finite semantic keymap. `keySequence()` already normalizes terminal arrow escape sequences through `@earendil-works/pi-tui` `parseKey()` as `up`, `down`, `right`, and `left`; however the default motion descriptors only bind `h`, `j`, `k`, and `l` to directional movement. Result: arrow keys resolve to no normal-mode motion.

The smallest safe fix is to add arrow-key aliases to the existing left/down/up/right semantic motions. That reuses the command parser, count handling, normal/visual motion dispatch, operator-motion allowlists, cursor restoration, and invalid-input behavior already covered by the modal pipeline.

## Goals / Non-Goals

**Goals:**

- Make physical arrow keys move the cursor in normal mode: `left`, `down`, `up`, `right` map to the same motions as `h`, `j`, `k`, `l`.
- Preserve count behavior for normal-mode arrows through the existing motion path.
- Preserve visual-mode extension behavior where visual modes already consume the same resolved motion keymap.
- Keep insert mode Pi-owned: arrow keys in insert mode continue delegating to the default editor/autocomplete path.
- Update tests and docs for the new default aliases.

**Non-Goals:**

- No new keymap option family.
- No direct modal-engine branch for arrow keys.
- No full Vim/Neovim parity or terminal-specific escape parser.
- No changes to Pi-owned shortcut protection.

## Decisions

1. **Represent arrows as default aliases on existing semantic motions.**
   - Seams: `src/keymap-descriptors.ts`, default keymap resolution in `src/config.ts`, command parser tests.
   - Add `left` to `left`, `down` to `down`, `up` to `up`, and `right` to `right` motion defaults.
   - Alternative rejected: special-case arrow keys in `src/modal/engine.ts`. That duplicates behavior and bypasses configured semantic keymap rules.
   - Alternative rejected: add new motion actions like `arrowLeft`. That creates redundant actions with identical cursor semantics.

2. **Reuse existing parser normalization.**
   - Seams: `src/modal/core.ts`, `@earendil-works/pi-tui` `parseKey()`.
   - `parseKey("\u001b[A")` returns `up`, `parseKey("\u001b[B")` returns `down`, `parseKey("\u001b[C")` returns `right`, and `parseKey("\u001b[D")` returns `left`, so no new escape parsing is needed.
   - Alternative rejected: locally decode ANSI arrow sequences. Existing runtime already normalizes them; duplicating it adds drift.

3. **Leave insert mode unchanged.**
   - Seams: `src/modal/engine.ts` `handleInsertInput()` and adapter delegation.
   - Insert-mode arrow keys should continue delegating to Pi/default editor behavior, including autocomplete navigation where Pi owns it.
   - Alternative rejected: route insert arrows through Vim motion helpers. That would steal default editor cursor behavior and violate insert-mode delegation requirements.

4. **Document aliases without implying broader key support.**
   - Seams: `docs/features.md`, `docs/settings.md`.
   - Docs should state arrows are aliases for the four directional motions and remain configurable through `piVimMode.keymap.motions`.
   - Alternative rejected: document arrows as a separate mode feature. They are not a new behavior family.

## Risks / Trade-offs

- [Risk] Existing tests assert exact default motion arrays. → Mitigation: update expectations to include aliases and add behavior tests proving arrows move through the same pipeline.
- [Risk] Arrow aliases in defaults could affect operator-motion defaults. → Mitigation: verify operator motion behavior remains deterministic; if arrows become valid after operators by default, document or constrain only if tests reveal undesired behavior.
- [Risk] Docs overstate support. → Mitigation: describe only normal/visual resolved motion contexts and explicitly preserve insert-mode delegation.

## Migration Plan

1. Add arrow aliases to directional motion defaults.
2. Add regression tests for normal-mode arrows and count behavior.
3. Add visual-mode arrow coverage if no existing resolved-motion test already covers aliases.
4. Update docs/settings references for default motion bindings.
5. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback: remove arrow aliases from default motion descriptors and revert docs/tests.

## Open Questions

- None. Arrow aliases should participate wherever the existing semantic motion action is already valid, including visual and operator-motion contexts, because they are aliases for the same left/down/up/right actions.
