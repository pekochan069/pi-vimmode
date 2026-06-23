## Why

Advanced pi-vimmode users need an explicit escape hatch for shortcuts Pi normally protects, such as binding a preferred key to a Vim action even when it sacrifices a Pi-owned shortcut. Today validation rejects protected shortcuts globally, so users cannot make that trade-off intentionally.

## What Changes

- Add an opt-in keymap setting that allow-lists protected shortcuts users explicitly permit pi-vimmode to bind.
- Keep default behavior safe: missing settings, built-in defaults, and presets must not claim Pi/system shortcuts.
- Preserve field-by-field validation: invalid override allow-list entries warn without discarding valid sibling keymap config.
- Document runtime limits, including terminal/Pi input paths that may still deliver chords such as `Ctrl+J` as `enter`.

## Non-goals

- No global "disable all shortcut protection" switch.
- No recursive mappings, Vimscript, `.vimrc`, timeout behavior, or arbitrary key grammar.
- No guarantee that OS, terminal, or Pi input layers deliver every system shortcut distinctly to pi-vimmode.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-keymap-configuration`: protected Pi shortcuts remain rejected by default, but an explicitly allow-listed protected key may be accepted as a user-owned pi-vimmode binding.

## Impact

- Code seams: `src/types.ts`, `src/config.ts`, `src/customization.ts` only if diagnostics need wording reuse, and focused keymap/runtime tests.
- Docs: `docs/settings.md` and `docs/features.md` update protected-key and escape-alias guidance.
- Specs: delta for `openspec/specs/vim-keymap-configuration/spec.md`.
- Dependencies: no new runtime or dev dependencies.
- Compatibility: non-breaking; existing configs and presets keep current protected-shortcut rejection behavior unless users opt in.
