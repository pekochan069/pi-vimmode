## 1. Keymap Defaults

- [x] 1.1 Add `left`, `down`, `up`, and `right` aliases to the existing left/down/up/right motion defaults in `src/keymap-descriptors.ts`.
- [x] 1.2 Verify no new keymap option family or modal-engine arrow special-case is needed.

## 2. Parser and Modal Tests

- [x] 2.1 Add regression tests proving normal-mode arrow keys move exactly like `h`, `j`, `k`, and `l`.
- [x] 2.2 Add a counted arrow-motion test proving count handling stays on the existing semantic motion path.
- [x] 2.3 Add coverage that arrow aliases participate in existing visual/operator motion contexts, or explicitly pin the supported subset if current behavior differs.
- [x] 2.4 Add or update default keymap resolution tests for directional motion aliases.

## 3. Documentation

- [x] 3.1 Update `docs/features.md` motion references to list arrow-key aliases for directional movement without implying full Vim parity.
- [x] 3.2 Update `docs/settings.md` default motion/keymap examples or reference text so `left`, `down`, `up`, and `right` aliases are visible.

## 4. Validation

- [x] 4.1 Run `bun test`.
- [x] 4.2 Run `bun run check-types`.
- [x] 4.3 Run `bun run lint`.
- [x] 4.4 Run `bun run format:check`.
- [x] 4.5 Run `openspec validate --specs --strict`.
