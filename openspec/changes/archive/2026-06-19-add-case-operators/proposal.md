## Why

Pi prompt editing lacks Vim case operators, forcing users to leave modal editing or rewrite text manually when changing word, text-object, or selected prompt ranges between lower, upper, and toggled case. This closes a small but common Vim editing gap while staying inside finite prompt-local grammar.

## What Changes

- Add normal-mode `gu`, `gU`, and `g~` as finite case operators for supported motion and text-object targets.
- Add doubled line forms `gugu`, `gUgU`, and `g~g~` to transform current or counted prompt lines.
- Add visual character, visual line, and visual block case transforms with `u`, `U`, and `~`.
- Preserve safe no-op behavior when a motion or text object target is missing.
- Record successful case changes for dot-repeat where the existing repeat model supports normal-mode changes.
- Update tests and docs for default behavior, supported targets, visual behavior, counts, repeat, and limitations.
- Non-goals: full Vim operator grammar, language-aware case conversion, locale-specific casing, recursive mappings, or Ex case-conversion commands.

## Capabilities

### New Capabilities

### Modified Capabilities

- `extended-vim-keybindings`: add finite normal/operator-pending and visual case transform behavior for `gu`, `gU`, and `g~`.
- `vim-keymap-configuration`: expose case operators through semantic keymap configuration without widening unsupported Vim grammar.

## Impact

- Affected seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/commands.ts`, `src/buffer.ts`, `src/modal/normal.ts`, `src/modal/visual.ts`, and adapter smoke tests where needed.
- Tests: parser, buffer range transforms, modal normal/visual behavior, keymap config, dot-repeat, and docs drift coverage.
- Docs: `docs/features.md` and `docs/settings.md` describe supported case operators and non-goals.
- Dependencies: no new runtime dependencies or peer dependency changes.
- Compatibility: no breaking changes; insert mode and Pi-owned shortcuts remain unchanged.
