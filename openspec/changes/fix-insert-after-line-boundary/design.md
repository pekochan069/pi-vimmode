## Context

pi-vimmode implements normal-mode `a` by transitioning to insert mode and returning an `adapterCommand` effect for Pi's native right-arrow behavior. Pi's editor models cursor positions as insertion points and intentionally lets Right move from one logical line's EOL to the next line's start. That behavior is correct for Pi but not for Vim's `a`, which must append within the current logical line.

This is visible in long wrapped prompts because scrolling and wrapping make the following blank logical line easy to overlook. Wrapping itself is not causal; the bug occurs whenever `a` runs from an EOL insertion position before another logical line.

## Goals / Non-Goals

**Goals:**

- Keep `a` on the current logical line when the snapshot cursor is already at EOL.
- Preserve `a` immediately-after-character behavior elsewhere.
- Keep the decision in modal semantics and Pi cursor execution in the adapter.
- Cover the exact live-editor regression involving a following blank line and a long wrapped prompt.

**Non-Goals:**

- Change Pi's native right-arrow semantics.
- Change `l`, Right, visual movement, operator movement, `i`, `I`, or `A`.
- Add configuration for newline crossing.
- Enforce full Vim cursor invariants throughout pi-vimmode.

## Decisions

### Decide movement from the modal snapshot

**Target seams:** `src/modal/normal.ts`, focused modal tests.

For `insertAfter`, return the rightward `adapterCommand` only when `snapshot.cursor.col` is less than the current logical line's length. At EOL or on an empty line, transition directly to insert mode without a cursor movement effect.

This uses state already available to modal command handling, keeps the condition independent of terminal width and viewport scroll, and preserves `ModalEffect` as the Pi adapter boundary.

**Alternatives rejected:**

- Guard Right inside `VimEditor.applyAdapterCommand`: rejected because that would change shared normal/visual right motions and make the adapter own command-specific Vim semantics.
- Add a new cursor-setting effect or pure buffer edit: rejected because no text changes and the existing optional adapter movement is sufficient.
- Fix Pi's editor: rejected because crossing logical lines is valid native right-arrow behavior.

### Keep behavior unconditional and unconfigured

**Target seams:** no changes to `src/config.ts`, `src/types.ts`, option cloning, or settings docs.

`a` will consistently follow its supported Vim meaning. No option will restore newline crossing.

**Alternatives rejected:**

- Add an `insertAfter` line-crossing setting: rejected because it would preserve known incorrect semantics, expand config propagation and live-editor testing obligations, and duplicate behavior available through Pi's native editing outside this command.

### Validate modal contract and real adapter behavior

**Target seams:** `test/modal.test.ts`, `test/vim-editor.test.ts`, `docs/features.md`.

Focused modal tests will assert effect presence after an existing character and effect absence at EOL. One real `VimEditor` regression test will use a long wrapped non-final logical line with a following blank line, invoke `a`, type text, and verify text remains on the original line. This single case covers adapter effect application, terminal wrapping, and viewport scrolling.

The feature guide remains the user-facing source of truth and will describe `a` as appending within the current logical line.

## Risks / Trade-offs

- **Risk: Cursor columns use Pi insertion-point semantics rather than a strict Vim character cursor.** Mitigation: predicate directly against current logical line length and test both existing-character and EOL positions.
- **Risk: Modal-only tests pass while adapter effect application still crosses lines.** Mitigation: include real `VimEditor` regression coverage.
- **Risk: Broader right-motion inconsistency remains.** Mitigation: keep it explicitly out of scope and address separately only if reported or specified.
- **Trade-off: No compatibility option for current behavior.** This is intentional because current behavior is a bug and no documented contract promises it.

Side effects remain unchanged: `a` writes no registers or marks, does not alter dot-repeat payloads, visual state, Ex messages, or Pi delegation, and keeps existing mode-transition clearing for search highlights and transient state. Only cursor placement changes at logical EOL.

## Migration Plan

Ship as a non-breaking patch. No data, settings, keymap, runtime dependency, or peer dependency migration is required. Rollback consists of reverting the conditional effect if an unforeseen adapter regression appears.

## Open Questions

None.
