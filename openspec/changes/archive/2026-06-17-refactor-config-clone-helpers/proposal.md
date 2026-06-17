## Why

`src/config.ts` repeats large hand-written clone logic for keymap, prompt transform, and UI option trees. This creates maintenance drift risk whenever settings fields change and keeps unnecessary source/emitted JavaScript in the package.

## What Changes

- Replace hand-written keymap cloning with small generic clone helpers for nested key sequence maps and action binding args.
- Replace prompt transform command cloning with descriptor-driven or generic object/array cloning that preserves current values exactly.
- Replace UI cloning repetition with reusable clone helpers for status items, labels, and shallow option objects.
- Preserve current configuration behavior: field-by-field parsing, warning behavior, valid-sibling retention, default isolation, and live editor construction.
- Add/adjust tests proving cloned defaults and resolved options do not share mutable arrays or nested objects with source defaults.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-editor-adapter-architecture`: Add a behavior-preserving architecture requirement that resolved editor options remain deeply isolated from defaults and caller-provided partial config across keymap, prompt transform, and UI clones.

## Impact

- Affected code: `src/config.ts`, especially `cloneKeymap`, `clonePromptTransforms`, `cloneUi`, and `cloneDefaultOptions` call paths.
- Affected tests: `test/config.test.ts` and any existing customization/live editor tests needed to protect clone isolation.
- Docs/API: no user-facing behavior, settings, public API, or docs changes expected.
- Dependencies: no new runtime or dev dependencies.
- Compatibility: no breaking changes.
- Non-goals: no keymap/action descriptor unification, no new settings, no validation behavior changes, no config file format changes, no runtime performance rewrite beyond smaller clone implementation.
