## Context

`src/config.ts` owns resolved `piVimMode` defaults, parsing, warning collection, merge behavior, and clone isolation. The current clone helpers are behaviorally correct but repeat every keymap, prompt transform, and UI field by hand, making every new configurable field require updates in multiple places.

This change follows the first active `TODOS.md` item: reduce hand-written clone repetition while preserving package-size goals and the existing insert-mode fast path work. Scope stays inside config cloning and its tests.

## Goals / Non-Goals

**Goals:**

- Reduce repetitive clone code in `src/config.ts` for keymap, prompt transform commands, and UI option trees.
- Preserve exact resolved option shapes and defaults for all existing settings.
- Preserve deep clone isolation for mutable arrays and nested option objects.
- Keep field-by-field invalid setting handling and valid-sibling retention unchanged.
- Add focused tests that fail if generic helpers accidentally share mutable defaults or caller-provided arrays/objects.

**Non-Goals:**

- No user-facing settings, keybindings, or UI behavior changes.
- No data-driven keymap/action descriptor unification; that is a later TODO.
- No command resolver cache, insert-mode fast path, or runtime metadata stripping.
- No docs/settings changes unless tests reveal existing docs are wrong.
- No new runtime or dev dependencies.

## Decisions

1. Target only clone construction seams in `src/config.ts`.
   - Seams: `cloneKeymap`, `clonePromptTransforms`, `cloneUi`, and `cloneDefaultOptions` callers.
   - Rationale: this directly addresses the TODO without touching parser, command resolver, modal engine, or adapter behavior.
   - Alternative considered: derive defaults, validation sets, and command resolver metadata from one descriptor table now. Rejected because that belongs to the second TODO and has broader resolver-equivalence risk.

2. Use small typed clone helpers for repeated object-of-array and shallow-object patterns.
   - Seams: keymap operator/motion/command maps, macro/mark/text-object maps, prompt transform command maps, UI status items and labels.
   - Rationale: these fields share simple copy semantics: clone arrays, clone plain records, copy primitives.
   - Alternative considered: generic JSON/stringify or `structuredClone`. Rejected because it is broader than needed, can obscure type intent, and may carry runtime/polyfill assumptions into package output.

3. Keep special-case clone logic where shape is not a plain object-of-arrays.
   - Seams: action bindings with nested `args`, UI mode labels/narrow labels, shallow option objects.
   - Rationale: explicit handling preserves the current contract and keeps future field additions visible at compile time.
   - Alternative considered: one recursive deep clone helper for every config value. Rejected because it can hide missing shape changes and weakens TypeScript guidance.

4. Prove behavior with clone-isolation tests, not only equality tests.
   - Seams: `test/config.test.ts` and existing live editor option propagation coverage if needed.
   - Rationale: `resolveVimOptions(undefined).options` can equal defaults while still sharing mutable arrays; tests should mutate clones and confirm defaults/caller inputs do not change.
   - Alternative considered: rely on existing default-resolution tests. Rejected because equality tests do not catch aliasing after later mutation.

5. Keep side effects unchanged.
   - Registers, marks, dot-repeat, search highlights, visual state, Ex messages, cursor placement, Pi delegation, and rendering are not touched by this refactor.
   - Config warnings, protected shortcut rejection, invalid field fallback, and live editor construction must remain byte-for-byte behaviorally equivalent from user perspective.

## Risks / Trade-offs

- Generic helper loses a field during cloning → Mitigation: use typed mapped helpers and tests covering representative nested keymap, prompt transform, and UI fields.
- Helper shares arrays from defaults or caller config → Mitigation: add mutation-based clone-isolation tests for default resolution and configured partials.
- Over-broad refactor accidentally changes validation or merge behavior → Mitigation: keep parsing/merge functions unchanged except call sites that consume clone helpers; run full `bun test`.
- Package-size win smaller than expected → Mitigation: keep success criteria as maintainability plus expected emitted-size reduction, not hard byte budget.
- Type inference becomes less clear → Mitigation: keep helper signatures narrow and local to `src/config.ts`; avoid untyped recursive clone utilities.

## Migration Plan

1. Add failing tests for default and configured option clone isolation.
2. Introduce local clone helpers in `src/config.ts`.
3. Replace repeated clone blocks incrementally: keymap first, prompt transforms second, UI third.
4. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.
5. Rollback strategy: revert helper replacement and keep added tests if they expose existing aliasing risk.

## Open Questions

- None. If implementation reveals missing clone isolation for another option family, add that family to tests before refactoring it.
