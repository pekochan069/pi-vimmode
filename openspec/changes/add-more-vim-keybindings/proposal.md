## Why

Current Vim mode covers core movement/editing, but prompt editing still misses common Vim shortcuts for quickly opening lines, joining text, changing/yanking/deleting with motions, and reaching buffer boundaries. Adding a focused set of high-frequency bindings makes the extension feel more Vim-native without trying to reach full Vim parity.

## What Changes

- Add more normal-mode motions for buffer boundaries, first non-blank navigation, and matching-pair jumps.
- Add insert-opening commands for lines above/below and append/insert convenience parity.
- Add operator + motion combinations for deleting, changing, and yanking practical ranges.
- Add line join and repeatable paste/edit behaviors where safe for prompt text.
- Preserve Pi-owned shortcuts and keep unmapped printable keys ignored in normal/visual modes.
- Update README keymap and tests for each new binding group.

## Capabilities

### New Capabilities

- `extended-vim-keybindings`: Additional Vim keybindings for prompt navigation, insertion, line editing, and operator-motion editing.

### Modified Capabilities

## Impact

- Affected code: `src/vim-editor.ts`, `src/commands.ts`, `src/buffer.ts`, `src/types.ts`.
- Affected tests: `test/*.test.ts` coverage for parser, buffer transforms, and editor integration.
- Affected docs: `README.md` supported keymap and limitations.
- No new runtime dependencies or Pi core changes expected.
