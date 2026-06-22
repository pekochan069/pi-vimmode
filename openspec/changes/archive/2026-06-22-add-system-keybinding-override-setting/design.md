## Context

`piVimMode.keymap` already validates semantic bindings in `src/config.ts`, normalizes key strings, and rejects protected Pi shortcuts through `protectedShortcutForKey()` from `src/customization.ts`. Runtime routing also delegates protected keys before keymap resolution in normal/visual modes, so config acceptance alone would not make keys such as `ctrl+p` usable.

The change adds one explicit user allow-list. Defaults and presets stay safe, and existing field-by-field warnings remain the failure mode for invalid settings.

## Goals / Non-Goals

**Goals:**

- Add `piVimMode.keymap.allowProtectedOverrides` as an opt-in array of key sequences.
- Accept protected keys in classic keymap groups, `keymap.escape`, and `keymap.actions` only when their normalized key is allow-listed.
- Route allow-listed protected keys through pi-vimmode in the modal states where the configured binding is meaningful.
- Preserve insert-mode Pi behavior unless the user explicitly configures an insert-mode binding such as an escape alias.
- Keep presets/defaults from adding protected overrides.

**Non-Goals:**

- No global boolean that disables all protection.
- No recursive mappings, timeout behavior, Vimscript, `.vimrc`, or arbitrary key grammar.
- No OS/terminal-level interception guarantee; pi-vimmode can only handle keys Pi receives distinctly.

## Decisions

### Decision 1: Use a per-key allow-list setting

- **Seams:** `src/types.ts`, `src/config.ts`, `docs/settings.md`.
- **Choice:** Add `allowProtectedOverrides?: readonly string[]` under `piVimMode.keymap`.
- **Rationale:** One explicit list makes user intent auditable and keeps blast radius smaller than a boolean.
- **Alternatives rejected:**
  - `allowProtectedOverrides: true`: too broad; one typo could steal many Pi shortcuts.
  - Per-binding objects like `{ key, overrideProtected: true }`: larger API and more parser churn for no extra behavior.

### Decision 2: Normalize override keys with existing key sequence parser

- **Seams:** `normalizeVimKeySequence()`, `parseKeymap()`.
- **Choice:** Parse `allowProtectedOverrides` with the same angle-bracket and modifier normalization used by bindings, then compare against `protectedShortcutForKey()` keys/aliases.
- **Rationale:** `<C-p>` and `ctrl+p` should mean the same thing, and invalid entries should warn without dropping valid siblings.
- **Alternatives rejected:** Raw string comparison would make docs and runtime diagnostics inconsistent.

### Decision 3: Keep validation centralized through an allow predicate

- **Seams:** `parseStringArray()`, `parseKeyBindings()`, `parseInsertEscapeArray()`, `parseActionBindingEntry()`.
- **Choice:** Derive one `allowProtectedKey` predicate per parsed keymap layer and pass it into classic keymap parsing and action binding parsing.
- **Rationale:** Existing parser already has a narrow protected-key exception hook for owned scroll controls; reuse it instead of adding post-parse mutation.
- **Alternatives rejected:** Filtering accepted bindings after merge would lose source-specific warnings and make project/global precedence harder to explain.

### Decision 4: Runtime protected delegation must respect effective keymap bindings

- **Seams:** `src/modal/engine.ts`, `src/modal/core.ts`, `src/commands.ts` tests, `src/vim-editor.ts` tests.
- **Choice:** In normal/visual routing, only delegate protected Pi keys before/after resolution when the effective keymap does not claim that key in the current context. Keep insert routing delegated except configured escape aliases.
- **Rationale:** `ctrl+p` accepted by config must dispatch like any other semantic binding; otherwise the new setting would parse but not work.
- **Alternatives rejected:** Removing protected delegation entirely would turn unmapped protected keys into Vim no-ops and break Pi shortcuts.

### Decision 5: Document limits, not promises outside pi-vimmode

- **Seams:** `docs/settings.md`, `docs/features.md`.
- **Choice:** State that overrides apply only to keys Pi delivers to the editor and that chords like `Ctrl+J` can arrive as `enter` depending on terminal/input mode.
- **Rationale:** Users need accurate behavior, not false OS-level override claims.
- **Alternatives rejected:** Promising universal system shortcut interception would exceed extension control.

## Risks / Trade-offs

- Protected key accepted but still delegated by a runtime fast path → add focused live editor tests for normal, visual, and insert/escape contexts.
- Users can break familiar Pi shortcuts intentionally → require per-key allow-list and document rollback by removing the key from `allowProtectedOverrides`.
- `Ctrl+J` may arrive as `enter` → document terminal limitation and test only keys the harness can deliver distinctly.
- More config state to clone/merge → include mutable-clone and project-overrides-global tests.

## Migration Plan

- Existing configs need no migration; default allow-list is empty.
- Rollback is deleting `allowProtectedOverrides` or removing the protected key from the list.
- No settings file is edited automatically.

## Open Questions

None.
