## 1. Canonical Property and Action Metadata

- [x] 1.1 Add focused failing metadata tests for exactly-once public trusted-config property/action coverage, required documentation fields, unique stable IDs/anchors, and exclusion of non-bindable diagnostic IDs.
- [x] 1.2 Extend source-backed config metadata with public JavaScript property paths, defaults, accepted shapes, assignment semantics, JSON crosswalks, and compatibility aliases without duplicating runtime option ownership.
- [x] 1.3 Extend canonical action metadata with `escape`, public factory paths, supported scopes, argument metadata, and compatibility aliases derived from existing keymap, mapping-scope, prompt-transform, and trusted-config API owners.
- [x] 1.4 Add compile-time fixtures that check metadata-backed property/action coverage and shapes against declaration-only `VimConfigApi` without generating or exposing runtime declarations.

## 2. Deterministic Reference Generator

- [x] 2.1 Add focused generator tests for stable ordering/serialization, explicit anchor generation, duplicate and missing metadata failures, unresolved links, and missing or duplicate marker failures.
- [x] 2.2 Implement one Bun generator that renders property and action blocks from canonical metadata and updates only their marker-delimited regions.
- [x] 2.3 Add generator check mode that compares expected and committed blocks, reports actionable drift, and shares rendering logic with write mode.
- [x] 2.4 Add package scripts for reference generation and clean-tree checking without new runtime or peer dependencies.

## 3. Canonical Config Reference

- [x] 3.1 Add `docs/config.md` guide shell with unique generated property/action markers and clear pointer to `docs/settings.md` as canonical detailed JSON reference.
- [x] 3.2 Generate and commit complete property entries with one stable anchor, accepted shape, built-in default, assignment/replacement semantics, aliases, and JSON crosswalk where applicable.
- [x] 3.3 Generate and commit complete action entries with one stable anchor, canonical factory, supported scopes, arguments, and compatibility aliases.
- [x] 3.4 Verify every generated local link resolves and a second generation/check pass leaves generated content unchanged.

## 4. Regression and Validation

- [x] 4.1 Run focused `bun test` coverage for config metadata, trusted JavaScript config, config resolution, public config types, generator behavior, and protected Pi shortcut handling.
- [x] 4.2 Run existing live `VimEditor` and modal regression coverage to confirm config parsing/editor construction, dot-repeat, register writes, search highlight clearing, visual range capture, cursor behavior, and Pi delegation remain unchanged.
- [x] 4.3 Run `bun test` and `bun run check-types`.
- [x] 4.4 Run `bun run lint` and `bun run format:check`.
- [x] 4.5 Run generated-reference check mode, `openspec validate generate-canonical-config-reference --strict`, and `openspec validate --specs --strict`.
