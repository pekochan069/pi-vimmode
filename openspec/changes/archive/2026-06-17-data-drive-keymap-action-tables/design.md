## Context

The second item in `TODOS.md` targets keymap/action table duplication. Today, built-in keymap data is spread across `src/config.ts` (`VIM_*_ACTIONS`, validation sets, `DEFAULT_VIM_KEYMAP`) and `src/commands.ts` (legacy operator/motion maps, reverse maps, character-search command sets, binding traversal helpers). This makes every new semantic action require updates in several places and increases drift risk across defaults, validation, diagnostics, and finite command parsing.

The existing product contract stays unchanged: pi-vimmode provides finite, prompt-local Vim-style key resolution through `piVimMode.keymap`; it does not add recursive mappings, timeout behavior, Vimscript, or Neovim parity.

## Goals / Non-Goals

**Goals:**

- Make built-in operators, motions, commands, text-object groups, macro/mark prefixes, and default key sequences descriptor-driven where this reduces duplication.
- Derive `DEFAULT_VIM_KEYMAP`, action allow-lists, validation sets, legacy semantic maps, reverse maps, and command resolver sets from shared typed metadata.
- Preserve all current default bindings, setting names, invalid-field fallback behavior, protected shortcut handling, and finite resolver results.
- Add equivalence tests that fail when descriptors drift from defaults, validation, or resolver compatibility.
- Keep implementation small enough to stay in package-size cleanup scope.

**Non-Goals:**

- No new keybindings or semantic actions.
- No compiled keymap lookup cache; that remains the later normal-mode performance TODO.
- No changes to user settings shape or public docs unless a docs drift test forces a generated/reference update.
- No recursive mappings, timeout semantics, Vimscript, `.vimrc`, or Neovim Lua support.
- No new runtime dependencies.

## Decisions

### 1. Add a typed keymap descriptor module

Create a small descriptor seam, likely `src/keymap-descriptors.ts`, that imports only public types from `src/types.ts` and exports `as const satisfies` descriptor objects for built-in keymap groups.

Target shape:

```ts
export const MOTION_DESCRIPTORS = {
  left: { defaults: ["h"], legacy: "h" },
  firstNonBlank: { defaults: ["^", "_"], legacy: "^" },
  bufferStart: { defaults: ["gg"], legacy: "gg" },
} as const satisfies Record<VimMotionAction, MotionDescriptor>;
```

Descriptor helpers should derive:

- ordered action arrays such as `VIM_MOTION_ACTIONS`, `VIM_COMMAND_ACTIONS`, and text-object action arrays;
- `DEFAULT_VIM_KEYMAP` nested records;
- validation `Set`s;
- legacy maps (`LEGACY_MOTION_TO_ACTION`, `ACTION_TO_LEGACY_MOTION`, operator maps);
- command sets such as char-argument and operator-target command groups when suitable.

Alternatives considered:

- Keep descriptors inside `src/config.ts`: rejected because `src/commands.ts` would keep importing config-specific implementation and the file would keep growing.
- Generate descriptors at build time: rejected as unnecessary tooling for static TypeScript data.
- Derive public union types from descriptors: rejected for this change because `src/types.ts` is the public contract. Use `satisfies Record<...>` to enforce descriptor coverage instead.

### 2. Keep runtime behavior field-by-field and finite

`src/config.ts` should continue parsing settings by keymap group and preserving valid siblings when one action is invalid. Derived sets replace hand-written allow-lists, but warning labels and fallback behavior should remain stable unless tests prove current text is impossible to preserve.

`src/commands.ts` should keep a finite semantic parser. Descriptor-derived maps should replace duplicated legacy maps and command classification sets, but not introduce dynamic user-programmable grammar.

Alternatives considered:

- Replace parser with a generic trie now: rejected because the compiled lookup cache is a separate TODO and could expand scope.
- Use descriptors to support every default sequence in `parseNormalCommand`: rejected unless existing tests already require it; this change should preserve legacy parser compatibility, not expand it.

### 3. Prefer derived records over shared mutable objects

Default records produced from descriptors must still be frozen or cloned before mutation-sensitive resolution. `resolveVimOptions()` should continue returning mutable copies that do not share nested arrays with `DEFAULT_VIM_OPTIONS` or user settings.

Alternatives considered:

- Export descriptor arrays directly as default keymap arrays: rejected because callers/tests mutate resolved options to verify copy isolation.
- Deep-freeze at every resolution: rejected as extra runtime cost; current clone-on-resolve pattern is sufficient.

### 4. Use tests as migration guardrails

Add focused tests before or alongside refactor:

- default keymap equals descriptor-derived expected records;
- each descriptor action is accepted by config parsing and unknown actions are rejected with valid siblings preserved;
- default operator/motion semantic maps match legacy `parseNormalCommand`, `legacyMotionToSemantic`, `semanticMotionToLegacy`, `legacyOperatorToSemantic`, and `semanticOperatorToLegacy` behavior;
- protected shortcut and duplicate/conflict warnings still run after derivation;
- configured keymap actions continue to resolve in normal, visual/operator-target, char-search, search, macro, mark, and text-object contexts covered by existing tests.

Alternatives considered:

- Rely only on existing behavior tests: rejected because the risky part is table drift and table coverage, not only runtime dispatch.

## Risks / Trade-offs

- Descriptor order changes could change conflict resolution or docs-facing order → preserve current declaration order and add snapshot/equivalence assertions.
- Shared helper abstractions could obscure group-specific rules such as line-only operators or single-key text objects → keep descriptor fields explicit and keep group-specific parser branches where behavior differs.
- Public types and descriptors can drift if unions remain in `src/types.ts` → use `satisfies Record<Union, Descriptor>` plus tests that compare exported action arrays to descriptor keys.
- Import cycles can appear between config, commands, and descriptors → keep descriptor module type-only on `src/types.ts`; `src/config.ts` and `src/commands.ts` import descriptors, not the other way around.
- Bundle-size goal could regress if descriptor metadata carries unused runtime fields → include only fields needed at runtime; avoid docs/test-only metadata in descriptor objects.

## Migration Plan

1. Add descriptor module and helper functions without changing exported behavior.
2. Switch `src/config.ts` action arrays, validation sets, and `DEFAULT_VIM_KEYMAP` to descriptor-derived values.
3. Switch `src/commands.ts` legacy maps and command classification sets to descriptor-derived values while keeping parser flow unchanged.
4. Add/update equivalence tests and run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.
5. If emitted bundle size measurement exists in package-size workflow, compare before/after; otherwise keep size win as expected but not a hard acceptance gate.

Rollback is straightforward: revert descriptor module plus imports; no data migration or settings migration is required.

## Open Questions

- Should descriptor helpers live entirely in `src/keymap-descriptors.ts`, or should tiny generic helpers live in `src/config.ts` to avoid exporting test-only helpers?
- Should tests assert exact warning strings or only warning presence and affected action labels for descriptor-derived validation?
- Is bundle-size measurement required for this cleanup, or are behavior/equivalence tests enough for apply readiness?
