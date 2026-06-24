## Why

Normal mode currently handles Vim `h`/`j`/`k`/`l` movement but does not move the prompt cursor when users press physical arrow keys. This breaks expected prompt navigation for users who mix Vim motions with standard terminal cursor keys.

## What Changes

- Add normal-mode arrow-key aliases for existing left/down/up/right cursor motions.
- Keep arrow-key movement prompt-local and count-compatible through the existing semantic motion pipeline.
- Extend visual-mode motion behavior only where it already reuses the resolved motion keymap, so arrow keys extend visual selections consistently.
- Update tests and user-facing docs for arrow-key aliases.
- Non-goals: full Vim/Neovim parity, recursive mappings, timeout-based key resolution, or changing insert-mode arrow-key delegation.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-mode-editor`: normal-mode cursor navigation includes physical arrow keys as aliases for left/down/up/right movement.
- `vim-keymap-configuration`: default motion bindings include arrow-key aliases while remaining semantic, finite, and configurable.

## Impact

- Affected code seams: `src/keymap-descriptors.ts`, `src/commands.ts` only if parser normalization needs adjustment, and existing modal motion paths in `src/modal/engine.ts`/`src/modal/normal.ts` through reused keymap resolution.
- Tests: add focused coverage in `test/modal.test.ts` and keymap/default-resolution tests if existing coverage asserts exact motion defaults.
- Docs: update `docs/features.md` and `docs/settings.md` motion/default-key references.
- Dependencies: no new runtime or development dependencies.
- Compatibility: no breaking changes; insert mode continues delegating arrow keys to Pi/default editor behavior.
