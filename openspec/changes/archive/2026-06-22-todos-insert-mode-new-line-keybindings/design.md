## Context

Insert mode currently treats ordinary typing and most control input as Pi-owned. `handleInsertInput` only owns physical `Esc`, configured escape aliases, autocomplete-specific delegation, and block insert input; normal-mode `o` / `O` already use `openLineBelow` / `openLineAbove` from `src/buffer.ts`.

`TODOS.md` asks for insert-mode newline keybindings so users can open previous/next prompt lines without leaving insert mode. Recent protected-override work also means users may want chords like `ctrl+j` / `ctrl+k`, but insert mode still needs to avoid becoming a broad mapping engine.

## Goals / Non-Goals

**Goals:**

- Add opt-in insert-mode bindings for open line below and open line above.
- Keep defaults unchanged: insert-mode text, autocomplete, submit/reset keys, and Pi-owned shortcuts still delegate to Pi.
- Reuse existing line-opening buffer semantics and cursor placement.
- Keep config validation field-by-field and live-editor safe.
- Document the exact insert-mode exception and non-goals.

**Non-Goals:**

- No full insert-mode keymap, Vimscript, recursive mappings, timeout mappings, abbreviations, or plugin API.
- No default insert-mode newline bindings.
- No new prompt-buffer line semantics beyond existing `openLineBelow` / `openLineAbove`.
- No new runtime dependencies.

## Decisions

1. Add a narrow `piVimMode.keymap.insert` surface with only `openLineBelow` and `openLineAbove`.
   - Target seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/config.ts`, docs.
   - Shape: `piVimMode.keymap.insert.openLineBelow` and `.openLineAbove`, both arrays of accepted single-key chords, defaulting to empty arrays.
   - Alternative: reuse `piVimMode.keymap.commands.openLineBelow` in insert mode. Rejected because normal-mode commands would unexpectedly steal insert text and imply many insert commands work.
   - Alternative: create broad `insertCommands`. Rejected as overbuilt; this TODO only needs previous/next line opening.

2. Accept only modified/protected single-key chords for insert newline bindings.
   - Target seams: key normalization and protected-key validation in `src/config.ts`.
   - Raw printable bindings such as `j` or `oo` are rejected so users can still type normally. Protected keys require same-layer `allowProtectedOverrides` before dispatch, matching existing protected override rules.
   - Alternative: support arbitrary finite multi-key insert sequences. Rejected because it needs buffering/timeout semantics and risks swallowing typed text.

3. Route configured insert newline keys through modal effects, not Pi delegation.
   - Target seams: `src/modal/engine.ts`, shared helper extracted from `src/modal/normal.ts` if needed.
   - `handleInsertInput` checks configured insert bindings after escape/autocomplete handling and before default `delegate(state, data)`.
   - Effects: apply existing `openLineBelow` / `openLineAbove`; remain in insert mode; clear search highlights on changed text; do not change registers, marks, visual state, macros, or dot-repeat; transient Ex messages keep current route-clearing behavior.
   - Alternative: delegate `Enter` or terminal newline to Pi. Rejected because Pi owns submit/reset behavior and cursor placement would differ from normal-mode `o` / `O`.

4. Preserve adapter fast-path safety by keeping matching insert newline keys out of fast delegation.
   - Target seam: `src/vim-editor.ts` / `canFastDelegateInsertInput` tests.
   - With raw printable bindings rejected, configured newline chords should naturally take the modal path, but tests should pin this so future key normalization does not bypass modal dispatch.

## Risks / Trade-offs

- Protected chords can still be intercepted by terminal/Pi before pi-vimmode receives them → Document delivery limits and keep allow-list explicit.
- Users may expect all normal commands to work in insert mode → Docs and runtime descriptions name only newline bindings.
- New nested config can be dropped by option cloning → Update defaults, clone helpers, and add a live `VimEditor` construction test.
- Insert command could regress autocomplete behavior → Keep autocomplete delegation before insert binding dispatch and test autocomplete-open cases.

## Migration Plan

- Add config/type/default support with empty defaults, so existing settings and behavior stay unchanged.
- Add modal dispatch and tests behind the new config surface.
- Update docs and mark the `TODOS.md` item complete during implementation.
- Rollback is removing the new config fields and dispatch branch; no persisted data migration.

## Open Questions

None. Default is opt-in only; users choose their own chords.
