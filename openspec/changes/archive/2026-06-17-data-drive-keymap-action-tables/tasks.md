## 1. Descriptor Source of Truth

- [x] 1.1 Add `src/keymap-descriptors.ts` with typed descriptor records for operators, motions, commands, macros, marks, text-object kinds, and text-object targets.
- [x] 1.2 Add descriptor helper functions to derive ordered action arrays, default keymap records, validation sets, legacy forward maps, and legacy reverse maps.
- [x] 1.3 Keep descriptor metadata runtime-lean: include only fields needed for defaults, validation, resolver classification, and legacy compatibility.
- [x] 1.4 Add descriptor coverage tests proving descriptor keys cover public semantic action unions and preserve current declaration order.

## 2. Config Integration

- [x] 2.1 Replace hand-written `VIM_*_ACTIONS` arrays and validation sets in `src/config.ts` with descriptor-derived exports.
- [x] 2.2 Replace hand-written `DEFAULT_VIM_KEYMAP` group records with descriptor-derived default records while preserving frozen defaults and clone isolation.
- [x] 2.3 Preserve field-by-field keymap parsing, protected shortcut warnings, duplicate/conflict diagnostics, and valid-sibling fallback behavior.
- [x] 2.4 Add or update config tests for descriptor/default keymap equivalence, supported-action acceptance, unsupported-action fallback, protected shortcut handling, and duplicate/conflict warnings.

## 3. Command Resolver Integration

- [x] 3.1 Replace `src/commands.ts` hand-written legacy operator/motion maps with descriptor-derived maps.
- [x] 3.2 Replace command classification sets for character-search, repeated character-search, and search-entry handling with descriptor-derived command metadata where practical.
- [x] 3.3 Keep `resolveNormalCommand()` parser flow finite and unchanged: no trie cache, recursive mappings, timeout behavior, or new user-visible bindings.
- [x] 3.4 Add or update command tests for legacy operator/motion map equivalence, default normal-mode resolution, operator-target resolution, pending-prefix invalidation, macro prefixes, mark prefixes, text objects, search commands, and character-search commands.

## 4. Cleanup and Documentation Check

- [x] 4.1 Remove duplicate table definitions that descriptors now own without leaving stale exported constants or dead helper code.
- [x] 4.2 Check docs drift tests and update `docs/settings.md` or related generated/reference docs only if existing validation requires it.
- [x] 4.3 Confirm package/runtime impact stays behavior-only and dependency-free; do not add runtime dependencies.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate --specs --strict`.
- [x] 5.6 Run `graphify update .` after code changes during implementation.
