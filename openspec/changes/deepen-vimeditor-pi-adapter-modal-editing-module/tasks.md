## 1. Adapter and Modal Contracts

- [x] 1.1 Add modal state, editor snapshot, modal options, movement target, cursor style intent, and modal effect types.
- [x] 1.2 Define which effects are adapter-applied versus modal-owned in code comments or adjacent module documentation.
- [x] 1.3 Add unit tests for basic effect contract shapes: delegate input, structural edit, invalidate, and terminal cursor style intent.
- [x] 1.4 Keep existing `VimEditor` construction from `src/index.ts` unchanged while contract types land.

## 2. Modal Engine Extraction

- [x] 2.1 Extract mode initialization and transient state reset logic from `VimEditor` into the modal module.
- [x] 2.2 Extract insert-mode input handling into the modal module while preserving autocomplete `Esc` delegation.
- [x] 2.3 Extract normal-mode printable key dispatch into the modal module using existing `src/commands.ts` parser results.
- [x] 2.4 Extract normal-mode edit decisions into modal effects while keeping `src/buffer.ts` as the pure text/register helper layer.
- [x] 2.5 Extract characterwise visual-mode handling into the modal module while preserving anchor, register, cancel, delete, yank, and change behavior.
- [x] 2.6 Extract visual-line mode handling into the modal module while preserving linewise register and mode-switch behavior.
- [x] 2.7 Add modal-engine tests for insert, normal, visual, visual-line, pending operator clearing, and delegated Pi shortcut intents.

## 3. Pi Adapter Refactor

- [x] 3.1 Slim `VimEditor extends CustomEditor` to collect snapshots, call the modal module, apply effects, and bridge rendering/status.
- [x] 3.2 Apply structural edit effects through `setText()` plus existing public cursor restoration behavior.
- [x] 3.3 Apply delegate effects through `super.handleInput(data)` and preserve Pi-owned shortcuts in all modes.
- [x] 3.4 Keep terminal cursor writes best-effort in the adapter and preserve reset behavior on editor shutdown.
- [x] 3.5 Verify `src/index.ts` lifecycle behavior and stable editor factory identity still work without modal-module coupling.

## 4. Rendering and Status Boundary

- [x] 4.1 Extract mode label, pending label, and visual summary derivation into testable helpers.
- [x] 4.2 Keep non-visual rendering on the `super.render(width)` path.
- [x] 4.3 Keep visual rendering through the existing visual render helper and pass only adapter-derived render inputs.
- [x] 4.4 Add or update tests for narrow-width status, visual summaries, cursor styling, and visual render width safety.

## 5. Documentation and Validation

- [x] 5.1 Update README or architecture documentation to describe the Pi adapter plus modal editing module split.
- [x] 5.2 Document refactor non-goals: no new keybindings, no private Pi APIs, and no full Vim parity expansion.
- [x] 5.3 Run `bun test` and fix regressions.
- [x] 5.4 Run `bun run check-types` and fix type errors.
- [x] 5.5 Run `bun run lint` and `bun run format:check`; fix reported issues.
  - Note: `bun run lint` passed. Changed files were formatted. Full `format:check` still reports pre-existing unrelated baseline files outside this change.
