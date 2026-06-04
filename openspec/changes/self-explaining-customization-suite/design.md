## Context

pi-vimmode already supports a finite semantic keymap, protected Pi shortcut delegation, Ex command-line mode, transient Ex messages, settings validation warnings, and user-facing feature/settings docs. The confusing gap is explainability: keymap validation can reject fields, lifecycle can show `vim ⚠`, protected shortcuts can delegate, and many no-op inputs can invalidate silently, but users do not have a runtime way to ask what happened or what actions are available.

Current seams:

- `src/config.ts` validates `piVimMode`, owns defaults, protected key rejection, keymap conflict detection, and settings warnings.
- `src/types.ts` exposes option/action types but has no preset or diagnostics type.
- `src/commands.ts` resolves configured key sequences to finite semantic commands, motions, operators, text objects, marks, macros, and prompt transforms.
- `src/ex.ts` parses finite Ex commands without Vimscript.
- `src/modal/engine.ts` executes Ex commands, handles no-op/delegation behavior, and owns modal state transitions.
- `src/vim-editor.ts` renders a single width-safe Ex row and applies modal effects through Pi editor APIs.
- `src/lifecycle.ts` currently uses settings warnings only to set `vim` vs `vim ⚠`; warning details are not retained for live editor diagnostics.

## Goals / Non-Goals

**Goals:**

- Give users compact runtime answers for “why is `vim ⚠` showing?”, “what does this key do?”, “why can’t I map this Pi shortcut?”, and “what actions exist?”.
- Add curated presets that remain field-by-field, warn safely, and compose with explicit user overrides.
- Keep diagnostic commands read-only: they MUST NOT edit prompt text, registers, marks, macros, search state, visual state, cursor position, or dot-repeat state.
- Keep output compact enough for the existing one-row Ex message model.
- Reuse one customization vocabulary across config validation, protected shortcut explanations, runtime commands, tests, and docs.

**Non-Goals:**

- No `.vimrc`, recursive mapping engine, Vimscript, Lua config, or open-ended key expression evaluator.
- No full interactive/paged command palette.
- No broad changes to Pi shortcut ownership.
- No large runtime docs browser; docs remain in `docs/features.md` and `docs/settings.md`.

## Decisions

### 1. Add a pure customization metadata/helper seam

Target seams: new `src/customization.ts` (or equivalent), plus `src/config.ts`, `src/commands.ts`, `src/ex.ts`, and tests.

Create a pure module that exposes:

- action metadata: id, kind, default keys, current keys, mode/context, description, and configurable status.
- protected shortcut catalog: normalized aliases, Pi owner/reason, runtime delegation behavior, and whether pi-vimmode explicitly owns the shortcut in normal mode.
- helper functions for `:actions`, `:keymap`, `:mapcheck`, and `:vimdoctor` summaries.

Rationale: action lists and protected shortcuts are currently split across types, config constants, runtime delegation logic, and docs. Copying those lists into Ex command handlers would drift quickly.

Alternatives considered:

- Inline everything in `executeExCommand()`: rejected because it would deepen `src/modal/engine.ts` branching and duplicate validation knowledge.
- Generate all metadata from the default keymap only: rejected because descriptions, ownership reasons, non-keymap controls, and protected shortcut explanations need metadata not present in `DEFAULT_VIM_KEYMAP`.

### 2. Keep diagnostic Ex commands finite and read-only

Target seams: `src/ex.ts`, `src/modal/engine.ts`, `src/modal/types.ts`, `src/vim-editor.ts`.

Extend the finite Ex parser with read-only commands:

- `:vimdoctor` — summarize settings diagnostics and highest-priority customization issue.
- `:keymap [query]` — show current binding(s) for matching actions or categories.
- `:mapcheck <key-or-sequence>` — explain whether a key is mapped, unmapped, protected, conflicting, or unsupported.
- `:actions [query]` — list/search supported semantic actions.

Execution returns a transient informational/error message only. It must not call buffer edit helpers or mutate editing side effects other than the transient message.

Rationale: existing Ex parsing is finite and explicit. These commands fit the model if treated as command names with small argument parsing.

Alternatives considered:

- Add a full help/command palette UI first: rejected as larger than the customization debugging need and coupled to future message-panel work.
- Put diagnostics behind settings docs only: rejected because runtime state and project/global settings precedence are exactly what users need explained.

### 3. Generalize the transient message model without adding a pager

Target seams: `src/modal/types.ts`, `src/modal/engine.ts`, `src/vim-editor.ts`, `src/modal/view.ts`.

Add or rename message state to support `kind: "error" | "success" | "info"` and text from both Ex and optional no-op feedback. Preserve current Ex row behavior: one width-fitted row below the prompt, clearing on next handled input.

Rationale: no-op feedback and diagnostic commands are not strictly Ex edit messages, but the existing one-row rendering path is the right bounded UI surface.

Alternatives considered:

- Reuse `exMessage` as-is: rejected because no-op feedback outside Ex would make naming misleading and encourage hidden coupling.
- Add a multi-line message panel now: rejected; TODO mentions reserved Ex display rows, but this change should avoid layout expansion.

Side effects: message-only updates must not change registers, marks, macro recording/playback, search highlights, visual ranges, prompt text, cursor placement, or dot-repeat state.

### 4. Preserve diagnostics from settings load into live editors

Target seams: `src/lifecycle.ts`, `src/vim-editor.ts`, `src/config.ts`, tests.

Carry settings diagnostics alongside resolved options from lifecycle to each `VimEditor` instance. `:vimdoctor` reads the retained diagnostics instead of re-reading or mutating settings.

Rationale: `vim ⚠` currently loses the warning payload after status update. Runtime diagnostics need the same warning data that caused the status.

Alternatives considered:

- Re-read settings inside `:vimdoctor`: rejected because editor commands should not touch settings files and could observe different state than the editor was constructed with.
- Store warnings inside `ResolvedVimEditorOptions`: acceptable only if carefully typed, but mixing behavior options and diagnostics risks option propagation bugs. Prefer a small runtime configuration object or editor constructor parameter.

### 5. Add presets as typed settings baselines before explicit fields

Target seams: `src/types.ts`, `src/config.ts`, `docs/settings.md`, tests.

Add `piVimMode.preset?: "minimal" | "prompt-safe" | "vim-heavy"`. Presets provide option baselines. Explicit fields from the same settings object override the selected preset. Project settings continue to override global settings field-by-field.

Recommended resolution order:

1. Built-in defaults.
2. Global preset baseline.
3. Global explicit fields.
4. Project preset baseline.
5. Project explicit fields.

Unknown presets warn and fall back safely without discarding valid sibling fields.

Rationale: users get safe starting points while retaining existing field-level customization behavior.

Alternatives considered:

- Presets as documentation-only examples: rejected because runtime `:vimdoctor`/`:keymap` should be able to report the selected customization baseline.
- Presets overriding explicit fields: rejected because it would violate current explicit-setting expectations.

### 6. Keep optional no-op feedback off by default and narrowly scoped

Target seams: `src/types.ts`, `src/config.ts`, `src/modal/engine.ts`, `src/vim-editor.ts`, docs/tests.

Add a setting such as `piVimMode.feedback.noop` with accepted values that default to quiet behavior. When enabled, only confusing no-ops produce transient info/error messages, such as protected shortcut delegation, invalid pending operator/motion, empty redo stack, or an unmapped key in normal mode. Routine safe misses should not flood output.

Rationale: explainability helps new users, but power users expect quiet modal editing.

Alternatives considered:

- Always show no-op feedback: rejected as noisy.
- Skip no-op feedback entirely: rejected because TODO explicitly calls for optional feedback and because it closes the loop with `:mapcheck`.

## Risks / Trade-offs

- Protected shortcut catalog can drift from runtime delegation → use one exported catalog/helper from config and modal runtime tests.
- Preset merge order can discard sibling settings → add config tests for global/project preset plus explicit overrides, invalid preset fallback, and live editor option propagation via `cloneOptions`.
- One-row diagnostics can be too terse → keep commands searchable and link docs; defer multi-line pager to a later Ex display/help change.
- No-op feedback can become noisy → default off and scope to confusing no-ops only.
- Action metadata can duplicate behavior if overbuilt → treat metadata as descriptive/introspection layer; command resolution still uses finite parser/keymap behavior until tests justify deriving behavior from metadata.
- Runtime diagnostics may expose stale warnings after settings reload → lifecycle must construct future editors with refreshed diagnostics, matching existing options refresh behavior.

## Migration Plan

1. Add pure customization/protected shortcut metadata and tests without changing runtime behavior.
2. Add preset and feedback option types/defaults/validation; update `cloneOptions` and live editor construction tests.
3. Preserve lifecycle diagnostics and pass them to editor instances.
4. Extend Ex parsing and modal execution with read-only diagnostic commands.
5. Generalize transient message state and preserve existing Ex row behavior/tests.
6. Add optional no-op feedback cases.
7. Update docs and OpenSpec validation.

Rollback: remove new settings and Ex command branches, retain previous defaults, and keep existing keymap behavior unchanged. Because new behavior is additive and default no-op feedback stays quiet, rollback should not require data migration.

## Open Questions

- Exact setting name for no-op feedback: `piVimMode.feedback.noop` is preferred, but implementation should choose the clearest shape before coding.
- Exact preset contents need final implementation taste, but each preset must be documented, tested, and must not bind protected Pi shortcuts.
- Whether to add an ADR for customization metadata as a durable source of truth depends on how much shared registry logic is introduced.
