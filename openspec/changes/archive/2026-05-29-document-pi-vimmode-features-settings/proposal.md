## Why

pi-vimmode now has enough modes, editing primitives, settings, and UI behavior that README-only documentation is hard to navigate and easy to drift from source. Users need dedicated docs that explain every feature and every setting with concrete examples before changing editor configuration.

## What Changes

- Add a user-facing feature guide at `docs/features.md` covering pi-vimmode activation, modes, motions, edits, visual modes, search, Ex substitution, registers, marks, macros, UI/status behavior, limitations, and validation commands.
- Add a settings reference at `docs/settings.md` documenting every `piVimMode` setting, default, accepted values, validation behavior, precedence, warnings, and practical JSON examples.
- Add a compact ADR under `docs/adr/` recording the docs structure and source-of-truth policy so future feature/settings docs stay aligned with code and OpenSpec specs.
- Keep docs-only scope: no code, config, package, or README edits.

## Capabilities

### New Capabilities

- `pi-vimmode-documentation`: User-facing documentation for pi-vimmode features, settings, examples, source-of-truth rules, and docs maintenance expectations.

### Modified Capabilities

None.

## Impact

- Affected files: new docs under `docs/` and `docs/adr/`; OpenSpec change artifacts under `openspec/changes/document-pi-vimmode-features-settings/`.
- Affected systems: project documentation only.
- No runtime behavior changes, no API changes, no dependency changes, no source/config edits.
