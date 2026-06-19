## Why

Prompt editing often uses blank lines to separate thoughts, examples, and pasted context. Adding paragraph motions and paragraph text objects closes the next TODO with practical Vim behavior for moving across and editing paragraph-sized prompt chunks without expanding into full Vim parity.

## What Changes

- Add normal and visual `{` / `}` paragraph motions over prompt-local paragraph boundaries.
- Allow motion-capable operators `d`, `c`, and `y` to target paragraph motions with finite range semantics.
- Add `ip` / `ap` paragraph text objects for operator targets.
- Add tests, feature docs, settings docs, and keybinding discovery metadata for the new actions.

Non-goals:

- No sentence motions, section motions, display-line motions, or full Vim text-object grammar.
- No language-aware or Markdown AST paragraph parsing; paragraph boundaries stay prompt-local and blank-line based.
- No new runtime dependencies.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `extended-vim-keybindings`: support paragraph motions and paragraph text objects in normal, visual, and operator-pending flows.
- `prompt-buffer-operations`: expose pure paragraph navigation and paragraph text-object range behavior for modal callers.
- `vim-keymap-configuration`: expose paragraph motion and paragraph text-object defaults through semantic keymap configuration, docs, and diagnostics.

## Impact

- Affected code seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/config.ts`, `src/commands.ts`, `src/buffer.ts`, `src/modal/normal.ts`, `src/modal/visual.ts`, `src/customization.ts`, runtime help/docs drift sources.
- Tests: focused parser, buffer, modal, visual, config, customization, docs drift, and live editor smoke coverage.
- Docs: `docs/features.md` and `docs/settings.md` update supported motions, text objects, limitations, and configurable action names.
- Compatibility: no breaking changes; existing keybindings/settings remain valid. No dependency or peer-runtime changes.
