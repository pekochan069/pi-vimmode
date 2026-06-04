## 1. Customization Metadata

- [x] 1.1 Add a pure customization metadata module for semantic actions, action descriptions, default/current binding lookup, and searchable action summaries.
- [x] 1.2 Move or mirror protected Pi shortcut knowledge into an authoritative catalog with normalized aliases, ownership reason, and runtime delegation behavior.
- [x] 1.3 Add focused unit tests for action search, keymap entry formatting, protected shortcut lookup, conflict explanation, and doctor summary helpers.

## 2. Types and Settings Resolution

- [x] 2.1 Add typed `piVimMode.preset` support for `minimal`, `prompt-safe`, and `vim-heavy` in `src/types.ts` and `src/config.ts`.
- [x] 2.2 Implement preset merge order: defaults, global preset, global explicit fields, project preset, project explicit fields.
- [x] 2.3 Add typed no-op feedback settings with quiet default behavior and invalid-field warnings.
- [x] 2.4 Update option cloning/live editor propagation so presets, feedback, keymap, UI, search, macros, marks, prompt structures, and prompt transforms survive `VimEditor` construction.
- [x] 2.5 Add config tests for valid presets, invalid preset fallback, explicit override precedence, project/global precedence, protected shortcut warnings, valid sibling preservation, and live editor option propagation.

## 3. Lifecycle Diagnostics

- [x] 3.1 Preserve settings warnings/diagnostics alongside resolved options in lifecycle state instead of only using them for the `vim ⚠` status.
- [x] 3.2 Pass retained diagnostics into each live `VimEditor` instance without re-reading settings files from editor commands.
- [x] 3.3 Add lifecycle tests proving warning details reach future editors after initial load and after settings refresh.

## 4. Ex Parser and Read-Only Commands

- [x] 4.1 Extend the finite Ex parser with `vimdoctor`, `keymap`, `mapcheck`, and `actions` parse results plus bounded argument validation.
- [x] 4.2 Implement read-only modal execution branches for diagnostic commands using customization helper summaries.
- [x] 4.3 Add Ex parser tests for supported commands, optional queries, required `:mapcheck` arguments, unsupported abbreviations, and unknown commands.
- [x] 4.4 Add modal tests proving diagnostic commands do not edit prompt text, cursor position, visual state, registers, marks, macros, search highlights, or dot-repeat state.

## 5. Messages, Feedback, and Rendering

- [x] 5.1 Generalize transient Ex message state into a bounded modal message that supports `error`, `success`, and `info` without changing existing Ex success/error behavior.
- [x] 5.2 Update render/view code so diagnostic and feedback messages use one width-safe row below the prompt and clear on next handled input.
- [x] 5.3 Implement optional no-op feedback for confusing ignored inputs such as protected shortcut delegation, invalid pending operator/motion, empty redo, and unmapped normal-mode keys.
- [x] 5.4 Add rendering and editor tests for width fitting, prompt viewport shrinkage, transient clearing, feedback disabled by default, and feedback enabled behavior.

## 6. Documentation

- [x] 6.1 Update `docs/features.md` with `:vimdoctor`, `:keymap`, `:mapcheck`, `:actions`, troubleshooting examples, protected shortcut explanations, no-op feedback behavior, and non-goals.
- [x] 6.2 Update `docs/settings.md` with preset names, merge precedence, no-op feedback setting, protected shortcut catalog, warning behavior, and JSON examples.
- [x] 6.3 Add or update a compact ADR only if implementation introduces a durable customization metadata source-of-truth policy.
- [x] 6.4 Cross-check docs against source helpers and tests so protected shortcut and settings tables do not drift.

## 7. Validation

- [x] 7.1 Run `bun test` and fix failures.
- [x] 7.2 Run `bun run check-types` and fix failures.
- [x] 7.3 Run `bun run lint` and fix failures.
- [x] 7.4 Run `bun run format:check` and fix failures.
- [x] 7.5 Run `openspec validate --specs --strict` and fix failures.
