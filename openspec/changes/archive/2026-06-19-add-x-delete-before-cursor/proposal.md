## Why

Normal mode supports `x` for deleting the character under the cursor, but not Vim's paired `X` command for deleting before the cursor. Adding `X` closes a small everyday editing gap while keeping scope prompt-local and finite.

## What Changes

- Add normal-mode `X` to delete the character before the cursor.
- Support numeric counts for `X`, deleting up to that many characters before the cursor.
- Store removed text in the unnamed character register, matching delete-style editing semantics.
- Keep `X` safe at prompt start or line start by leaving prompt text unchanged.

## Capabilities

### New Capabilities

### Modified Capabilities

- `extended-vim-keybindings`: Add normal-mode `X` delete-before-cursor behavior, including count and safe boundary semantics.

## Impact

- Affected code seams: `src/commands.ts`, `src/buffer.ts`, `src/modal/engine.ts`, and focused tests.
- Documentation: update `docs/features.md` keymap reference.
- Dependencies: no new runtime dependencies.
- Compatibility: no breaking changes; `Ctrl+X` numeric decrement remains distinct from uppercase `X`.

## Non-goals

- No broad Vim parity expansion beyond `X`.
- No new keymap configuration surface.
- No visual-mode or operator-motion meaning for `X`.
