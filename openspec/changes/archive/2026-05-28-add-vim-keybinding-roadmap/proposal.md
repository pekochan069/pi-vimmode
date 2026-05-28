## Why

pi-vimmode covers core modal editing, but Vim-fluent prompt editing still has noticeable gaps around numeric adjustment, counted commands, word-end movement, small substitutions, repeatable changes, line-local find, and text objects. Adding these in staged batches makes prompt composition faster without trying to deliver full Vim parity at once.

## What Changes

- Add Phase 1 normal-mode editing speed commands: `Ctrl+A`, `Ctrl+X`, counts, `e`, `r{char}`, `s`, and `S`.
- Add Phase 2 movement/repeat power: `f`, `F`, `t`, `T`, `;`, `,`, and `.` repeat.
- Add Phase 3 prompt-friendly text objects for operators: `iw`, `aw`, quote objects, and bracket objects.
- Preserve Pi shortcut compatibility: control shortcuts keep delegating unless pi-vimmode explicitly owns the binding.
- Update documentation and validation to show which Vim behaviors are supported and which remain deferred.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `extended-vim-keybindings`: Extend normal-mode editing, motion, operator-motion, repeat, and text-object behavior.
- `vim-keymap-configuration`: Extend semantic keymap support for newly supported motions, commands, and operator targets where configurable keymap coverage is appropriate.

## Impact

- Affected code: modal command parsing, buffer editing operations, modal engine state/effects, keymap resolution, tests, and README documentation.
- Affected behavior: normal-mode key handling, operator-motion resolution, count prefixes, repeat state, and explicit ownership of `Ctrl+A` / `Ctrl+X`.
- No breaking changes intended; existing supported keybindings, settings, registers, macros, visual modes, and Pi shortcut delegation should continue to work.
