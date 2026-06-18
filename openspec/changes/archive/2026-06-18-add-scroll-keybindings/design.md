## Context

`pi-vimmode` already resolves finite normal/visual motions through `src/commands.ts`, semantic keymap descriptors, and modal dispatch in `src/modal/normal.ts`. Rendering scrolls the visible prompt window around the cursor (`src/render.ts`), but normal mode has no Vim-native half-page movement. `<C-d>` is currently Pi-protected and delegated before normal-mode parsing, so supporting Vim scroll-down requires explicit normal/visual ownership without changing insert-mode delegation.

## Goals / Non-Goals

**Goals:**

- Add `<C-d>` and `<C-u>` as prompt-local half-page down/up motions in normal and visual modes.
- Keep behavior finite, count-aware, and clamped to prompt bounds.
- Make the motions configurable through `piVimMode.keymap.motions` and visible through existing keybinding catalog/help surfaces.
- Preserve insert-mode Pi/default editor behavior for control keys.

**Non-Goals:**

- No `<C-f>`, `<C-b>`, `zz`, `zt`, `zb`, scrolloff, or smooth scroll state.
- No new render viewport state; cursor movement remains the source of visible scroll.
- No operator-motion support for scroll motions in this change.

## Decisions

1. Add semantic motions, not ad-hoc modal branches.
   - Target seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/commands.ts`, `src/modal/normal.ts`.
   - Decision: introduce two `VimMotionAction` values such as `halfPageDown` and `halfPageUp`, default-bound to `ctrl+d` and `ctrl+u`.
   - Alternative rejected: special-case raw `<C-d>` / `<C-u>` in `src/modal/engine.ts`. That bypasses keymap configuration, keybinding discovery, count parsing, and parser tests.

2. Move cursor by prompt lines using a viewport-derived amount.
   - Target seams: `src/buffer.ts`, `src/modal/normal.ts`.
   - Decision: add/reuse a pure buffer helper that moves from the current cursor line by `direction * amount`, clamps line and column to the target line, and returns a `Position`. `amount` should be half the visible prompt row budget, with a minimum of 1; counts multiply that amount.
   - Alternative rejected: mutate render scroll offset directly. Existing render has no durable scroll state, and adding one would be more code than this feature needs.

3. Keep `<C-d>` Vim-owned only where Vim modes own input.
   - Target seams: `src/modal/core.ts`, `src/customization.ts`, config validation.
   - Decision: normal/visual mode should let `ctrl+d` reach the semantic parser; insert mode should continue delegating it. Runtime shortcut metadata should describe this split ownership.
   - Alternative rejected: remove `<C-d>` from protected shortcuts globally. That risks stealing Pi/default editor behavior in insert mode.

4. Do not allow scroll motions as operator motions yet.
   - Target seams: `src/config.ts`, `src/modal/normal.ts`.
   - Decision: omit `halfPageDown` / `halfPageUp` from default `operatorMotions`; reject or ignore configured operator-motion use with the existing invalid-motion warning path.
   - Alternative rejected: implement `d<C-d>` / `y<C-u>` now. That needs durable range semantics and register expectations, not needed for prompt scrolling.

5. Let existing docs/catalog machinery surface the keys.
   - Target seams: `src/customization.ts`, `docs/features.md`, `docs/settings.md`, docs drift tests.
   - Decision: add descriptions in the typed action catalog and update docs. No separate help registry or popup implementation.
   - Alternative rejected: handwritten help-only rows. They drift from semantic keymap descriptors.

## Risks / Trade-offs

- Normal-mode `<C-d>` changes from delegated to Vim scroll → Mitigation: document mode-specific ownership and keep insert mode delegated.
- Wrapped terminal rows may not match prompt lines exactly → Mitigation: use existing cursor-driven scroll model; defer display-row-perfect scroll until user need appears.
- Configured operator-motion use could silently no-op → Mitigation: rely on config validation/warnings and tests for unsupported scroll operator motions.
- Runtime help/docs drift → Mitigation: update docs and existing catalog/drift tests with source-backed keys.

## Migration Plan

1. Add semantic motion types and defaults.
2. Add pure cursor movement helper and modal dispatch.
3. Adjust protected shortcut handling for normal/visual `<C-d>` only.
4. Update tests and docs.
5. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback: remove the two motion defaults and restore `<C-d>` to protected delegation in all modes. No data migration.

## Open Questions

- Should a later change add `<C-f>` / `<C-b>` full-page motions? Deferred until requested.
- Should scroll amount use visual wrapped rows instead of prompt lines? Deferred unless line-wrap behavior feels wrong in real use.
