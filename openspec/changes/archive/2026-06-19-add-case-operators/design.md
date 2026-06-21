## Context

`pi-vimmode` already has finite normal operators (`d`/`c`/`y`), text objects, visual operations, semantic keymap descriptors, and a single-character `~` toggle-case command. Missing piece is range-based case conversion: `gu`, `gU`, and `g~` over finite motions, text objects, current lines, and visual selections.

Keep this prompt-local. No full Vim grammar, no locale-aware casing, no Vimscript, and no adapter-side string surgery.

## Goals / Non-Goals

**Goals:**

- Add lower, upper, and toggle case transforms for finite normal operator ranges.
- Support motion targets, text-object targets, current/count line targets, and visual char/line/block selections.
- Preserve existing register behavior: case transforms do not write unnamed or named registers.
- Preserve visual state behavior: successful visual transforms clear selection and return to normal mode.
- Make default `gu`, `gU`, and `g~` semantic keymap operators, with settings/docs coverage.
- Keep successful normal-mode case changes dot-repeatable.

**Non-Goals:**

- Full Vim operator grammar or arbitrary `g` commands.
- Case transforms through mark, search, repeated character search, or Ex targets in this change.
- Locale-specific or language-aware case conversion.
- New dependencies or runtime adapter APIs.

## Decisions

1. Generalize existing case helpers in `src/buffer.ts` instead of adding modal string splices.
   - Seams: `src/buffer.ts`, `test/buffer.test.ts`.
   - Use one range transform helper for lower, upper, and toggle over character, line, and block ranges.
   - Keep single-code-point-safe mapping: if JavaScript case conversion expands a character into multiple code points, leave that character unchanged.
   - Alternative rejected: inline transforms in `src/modal/normal.ts` / `src/modal/visual.ts`; too easy to drift from visual range and cursor invariants.

2. Add explicit semantic case operators, not overloaded commands.
   - Seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/commands.ts`.
   - Add case operator actions for lowercase, uppercase, and toggle-case with defaults `gu`, `gU`, and `g~`.
   - Treat them as range-capable operators for finite motions and text objects, plus line forms.
   - Reject mark/search/character-search targets until they have explicit range-transform contracts.
   - Alternative rejected: parse raw `g` branches in modal code; breaks configured keymaps and descriptor-derived resolver consistency.

3. Keep register and mode side effects narrower than delete/change/yank.
   - Seams: `src/modal/normal.ts`, `src/modal/visual.ts`, `src/modal/types.ts` repeat state.
   - Case transforms edit text and cursor only. They do not update registers, do not enter insert mode, and do not alter marks/search highlights beyond existing edit invalidation behavior.
   - Normal successful changes record a semantic repeatable case change. Visual case changes do not record dot-repeat unless an existing visual-repeat contract appears later.
   - Alternative rejected: reuse delete/change operator paths; they write registers and change modes.

4. Extend semantic keymap docs carefully.
   - Seams: `src/config.ts`, `src/types.ts`, `src/keymap-descriptors.ts`, `docs/settings.md`.
   - `piVimMode.keymap.operators` accepts case operators and keeps field-by-field fallback behavior.
   - `operatorMotions` can include case operators if implementation chooses per-operator motion allow-lists; shift operators remain line-only and excluded.
   - Live editor construction must preserve resolved keymap options; add a live smoke test for a configured case operator.
   - Alternative rejected: fixed raw defaults only; users can configure existing finite operators, so new finite operators should follow same contract.

5. Layer tests by seam.
   - Parser: `guw`, `gUiw`, `g~g~`, counts, configured operator, invalid targets.
   - Buffer: lower/upper/toggle char, line, block, non-letter no-op, Unicode expansion guard.
   - Modal: normal operator motion/text object/line, visual char/line/block, register preservation, dot-repeat.
   - Adapter/docs: one configured-key live smoke test and feature/settings docs drift checks if present.

## Risks / Trade-offs

- Parser prefix collision around `g` → Mitigation: add descriptor defaults and resolver tests for `gg`, `ge`, `gE`, `gu`, `gU`, `g~`, and action bindings sharing `g` prefixes.
- Case operators accidentally delete via generic operator paths → Mitigation: introduce a dedicated case transform path and reject unsupported target families explicitly.
- Unicode case conversion changes string length → Mitigation: only apply one-code-point-to-one-code-point mappings.
- Config docs drift from runtime behavior → Mitigation: update `docs/settings.md`, config validation tests, and live editor smoke coverage.
- Visual `u` conflicts with normal undo semantics → Mitigation: handle visual-mode `u` as lowercase only in visual routing; normal mode keeps `u` as undo.

## Migration Plan

- Additive change only. Existing prompts, settings, and keybindings keep current behavior unless users opt into new case operator mappings.
- Rollback is removing the new descriptors, parser branches, helpers, docs, and tests from this change; no data migration.

## Open Questions

- None for proposal scope.
