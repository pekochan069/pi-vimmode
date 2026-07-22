## Context

EasyMotion is opt-in and has no default binding. Its current command flow collects case-insensitive character matches, assigns up to 52 labels, displays those labels, and moves the cursor after label selection.

At commit `e1544e2`, display labels were written into the Pi prompt through modal `edit` effects and later restored from a full prompt snapshot. Every changed edit clears adapter redo history, so presentation could alter undo/redo semantics and any missed cleanup path could leak labels into prompt content.

This change starts from a later branch that already contains partial render-only mechanics introduced in unrelated reload work: label metadata reaches `src/render.ts`, and common highlight paths no longer emit edits. Dedicated effect/history regressions are still missing, and the unreachable `jump` state remains. Implementation must characterize current behavior first, keep valid partial work, and complete only remaining gaps.

Constraints:

- Preserve existing opt-in command and `piVimMode.easymotion.labelColor` contract.
- Preserve existing case-insensitive prompt-wide targeting and 52-label limit.
- Keep `src/modal/engine.ts` responsible for modal transitions, `src/vim-editor.ts` as thin adapter, and `src/render.ts` responsible for presentation.
- Treat automated and manual verification as release gates.

## Goals / Non-Goals

**Goals:**

- Make EasyMotion labels presentation-only for every entry and exit path.
- Preserve prompt text and undo/redo history on highlight, cancellation, invalid input, and successful selection.
- Keep valid selection limited to cursor movement plus rerendering.
- Preserve render width, ANSI reset behavior, configured label color, and existing cursor/selection precedence.
- Remove restoration-only state and unreachable EasyMotion state.
- Add focused modal, render, and live-adapter regression coverage.

**Non-Goals:**

- Fix repeated `,` character-search direction behavior.
- Add or change default bindings, action descriptors, or settings.
- Add more than 52 labels, multi-character labels, ranking, viewport filtering, or full Vim/Neovim EasyMotion parity.
- Refactor unrelated modal, render, reload, undo, or redo architecture.
- Add dependencies.

## Decisions

### 1. Modal state stores target metadata, never prompt restoration data

**Seams:** `src/modal/engine.ts`, `src/modal/types.ts`

Highlight state contains only `{ label, line, character }` targets. Entering highlight state invalidates rendering without emitting a text edit. `Escape` clears pending EasyMotion state. A valid label clears pending state and emits cursor restoration plus invalidation. An invalid label leaves highlight state active and invalidates without changing text. The unused `jump` variant and its handler/display branches are removed when repository search confirms no constructor.

Alternative: retain `originalText` and compensating edits. Rejected because it keeps presentation coupled to prompt ownership, creates undo/redo side effects, and relies on every exit path restoring correctly.

Alternative: keep unreachable `jump` state for future work. Rejected because no current behavior constructs it and speculative state increases cleanup paths.

### 2. Renderer substitutes target labels over immutable prompt cells

**Seam:** `src/render.ts`

Renderer resolves target metadata by prompt coordinate and uses target label as displayed cell content without changing snapshot text. Existing bounded target data may be looked up directly; no second restoration model is needed. Wide target cells keep original display width by padding a shorter label. Configured label color is followed by ANSI reset.

Cursor and active visual-selection styling retain precedence over EasyMotion color, while displayed glyph remains target label. EasyMotion labels retain precedence over search highlighting at target coordinates. This matches existing composition order and avoids unrelated visual changes.

Alternative: pre-edit copied render lines before normal rendering. Rejected because it duplicates text transformation and risks coordinate drift across wrapping and wide cells.

Alternative: continue rendering underlying character with only EasyMotion color. Rejected because label selection requires visible target labels, not merely highlighted matches.

### 3. Adapter forwards complete render metadata and performs no EasyMotion text recovery

**Seam:** `src/vim-editor.ts`

`VimEditor` passes each target label and coordinate into render input. It does not inspect `originalText`, undo a temporary edit, or special-case text restoration during reconfiguration. Cursor movement remains adapter-owned through existing `restoreCursor` handling.

Alternative: have adapter overlay labels or restore text. Rejected because renderer already owns cell presentation and adapter-owned recovery would preserve original ownership error.

### 4. Tests lock ownership and history boundaries

**Seams:** `test/modal.test.ts`, `test/render.test.ts`, `test/vim-editor.test.ts`

Modal tests assert highlight transitions and exit paths never produce `edit` effects. Renderer tests assert label substitution, color/reset, multiline/wide-cell behavior, and composition precedence. Live editor tests prove text remains unchanged, valid labels move cursor, invalid labels do not edit, undo immediately reaches prior real edit, and redo survives open/cancel.

Tests also cover no match, case-insensitive matching, uppercase/lowercase label selection, and the 52-target ceiling. Manual terminal checks cover realistic invocation, multiple selections, history preservation, multiline input, invalid labels, and custom color.

Alternative: rely on full-suite green status. Rejected because existing tests passed while EasyMotion still mutated prompt content.

### 5. Keep configuration stable and correct user-facing docs

**Seams:** `src/config.ts`, `src/types.ts`, `docs/features.md`, `docs/settings.md`, `README.md`

No setting, default, keymap surface, or public option changes. Therefore config parsing, `VimEditor` option cloning, and settings docs require no changes. Add canonical behavior wording to `docs/features.md` and keep README concise while correcting its stale claims that `f`/`t`/`F`/`T` trigger EasyMotion, matching is line-local, and labels require text restoration.

Alternative: leave docs unchanged because visible labels look similar. Rejected because current trigger, match scope, and prompt-ownership claims are materially false.

Alternative: add a render-only setting or new default binding. Rejected as unrelated scope and unnecessary configuration.

## Risks / Trade-offs

- **Partial implementation arrived in unrelated commit:** tests may pass before all intended cleanup is owned by this change. **Mitigation:** inspect current diff/state, add dedicated regressions first, then delete only remaining dead/restoration code.
- **Render precedence regression:** labels could hide cursor/selection or lose color/reset. **Mitigation:** focused tests for target under cursor, selected target, search overlap, configured color, and ANSI reset.
- **Coordinate/width mismatch:** multiline, wrapped, Unicode, or wide cells could misplace labels or change terminal width. **Mitigation:** preserve existing logical coordinates and add multiline plus wide-cell width tests.
- **History regression hidden by unchanged final text:** temporary edits could still clear redo after compensation. **Mitigation:** assert no modal `edit` effect and test live redo after EasyMotion open/cancel.
- **Bounded label set leaves later matches unlabeled:** existing 52-target limit remains. **Mitigation:** test deterministic cap; expansion requires separate proposal.

## Migration Plan

1. Add focused failing/characterization tests at modal, render, and live adapter seams.
2. Keep existing correct render-only work; remove any remaining prompt restoration data, edit effects, adapter recovery, and unreachable `jump` state.
3. Run automated validation: `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.
4. Run required manual terminal sequence before release.

No data or configuration migration is required. Rollback is a code revert; release must remain blocked rather than restoring buffer-mutating labels.

## Open Questions

None. Invalid labels retain current highlight state while leaving prompt text unchanged; changing cancellation UX requires separate evidence and scope.
