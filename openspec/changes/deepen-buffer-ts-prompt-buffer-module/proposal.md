## Why

`src/buffer.ts` has grown from shared text helpers into the place where prompt editing rules are easiest to test, but callers still assemble too much behavior from low-level pieces. Deepening it into a prompt buffer operation module improves locality for navigation, visual operations, linewise operations, operator-motion operations, and paste while reducing adapter/render coupling.

## What Changes

- Refactor `src/buffer.ts` around higher-level prompt buffer operations instead of exported helper piles.
- Move operation composition for navigation, visual selections, linewise commands, operator-motion commands, and paste into the buffer module.
- Keep `src/vim-editor.ts` focused on Pi adapter/modal orchestration and `src/render.ts` focused on rendering.
- Add or update focused buffer tests so prompt editing behavior is validated through operation-level APIs.
- Preserve current keymap and user-facing Vim behavior; no breaking changes.

## Capabilities

### New Capabilities

- `prompt-buffer-operations`: Prompt buffer module exposes cohesive operation-level behavior for navigation, visual edits, linewise edits, operator-motion edits, and paste.

### Modified Capabilities

- `vim-editor-adapter-architecture`: Adapter/module boundary tightens so modal/editor callers use prompt buffer operations rather than assembling low-level text helpers.

## Impact

- Affected files: `src/buffer.ts`, `src/vim-editor.ts`, `src/render.ts`, `test/buffer.test.ts`, and any tests that assert editor integration behavior.
- Public user behavior should remain unchanged.
- No new runtime dependencies expected.
