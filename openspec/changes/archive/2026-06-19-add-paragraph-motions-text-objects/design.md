## Context

pi-vimmode already has a finite semantic parser, pure prompt-buffer helpers, modal dispatch, configurable keymap descriptors, and user docs for supported prompt-local motions and text objects. The next TODO adds paragraph-level editing: `{` / `}` motions and `ip` / `ap` text objects.

Current text objects cover words, quotes, brackets, braces, and prompt-native structures. Current motions cover word/WORD, buffer, matching pair, and half-page movement, but there is no blank-line paragraph model.

## Goals / Non-Goals

**Goals:**

- Add prompt-local paragraph navigation for `{` and `}` in normal and visual modes.
- Support paragraph motions after `d`, `c`, and `y` with finite range/register semantics.
- Support `ip` and `ap` paragraph text objects through the existing operator text-object flow.
- Keep default and configured keymaps, diagnostics, runtime help, docs, and drift tests aligned.

**Non-Goals:**

- No full Vim paragraph grammar, nroff macros, sentence motions, section motions, or AST-backed Markdown parsing.
- No recursive mappings, timeout behavior, Vimscript, `.vimrc`, or Neovim parity claims.
- No new runtime dependencies.

## Decisions

1. Blank-line paragraph model lives in `src/buffer.ts`.
   - Target seams: `src/buffer.ts`, `test/buffer.test.ts`.
   - Approach: define a paragraph as a contiguous run of nonblank lines, separated by one or more whitespace-only blank lines. Add pure helpers for paragraph-forward/backward positions, paragraph operator ranges, and paragraph text-object ranges.
   - Alternative rejected: Markdown/list-aware paragraph parsing. Too broad; prompt-native structures already own Markdown-ish structure behavior.
   - Alternative rejected: inline paragraph math in modal handlers. Would duplicate range/clamp/register logic and violate existing buffer-helper boundary.

2. Paragraph actions join semantic keymap descriptors, not raw parser special cases.
   - Target seams: `src/types.ts`, `src/keymap-descriptors.ts`, `src/config.ts`, `src/commands.ts`, `src/customization.ts`.
   - Approach: add motion actions `paragraphBackward` / `paragraphForward` with defaults `{` / `}`, and text-object target `paragraph` with default `p`. Include paragraph motions in default delete/change/yank operator-motion allow-lists. Let the compiled keymap resolver handle defaults, configured keys, conflicts, and prefixes.
   - Alternative rejected: hard-code `{`, `}`, and `p` in `resolveNormalCommand()`. That would bypass settings, diagnostics, `:keybindings`, and docs drift sources.

3. Modal behavior reuses existing motion and text-object flows.
   - Target seams: `src/modal/normal.ts`, `src/modal/visual.ts`, `src/modal/engine.ts` tests.
   - Approach: route normal/visual paragraph movement through `moveUpdate`; route operator paragraph motions through `applyOperatorMotion`; route `ip` / `ap` through `applyOperatorTextObject`. Add only narrow branches needed to map semantic actions to buffer helpers.
   - Side effects: delete/change write the unnamed character register, yank preserves prompt text, change enters insert mode, successful delete/change records dot-repeat through existing repeatable-change paths, visual motion preserves anchor and updates active cursor, search highlights and marks are not mutated.
   - Alternative rejected: add a new paragraph command family. Existing motion/text-object families already model these behaviors.

4. Around paragraph includes one adjacent separator when possible.
   - Target seams: `src/buffer.ts`, `test/buffer.test.ts`.
   - Approach: `ip` selects the current paragraph body only. `ap` selects the body plus following blank separator lines when present; if no following separator exists, include preceding separator lines when present. This keeps deleting a paragraph from leaving accidental double separators.
   - Alternative rejected: `ap` always equals `ip`. Too surprising for Vim users and less useful for prompt cleanup.

5. Docs and discovery update from the same semantic surface.
   - Target seams: `docs/features.md`, `docs/settings.md`, runtime help/drift tests, customization/keybinding catalog tests.
   - Approach: document finite blank-line semantics, defaults, configurable action names, operator support, text-object behavior, and non-goals. Add drift tests so docs, descriptors, and runtime help stay consistent.
   - Alternative rejected: only update feature guide prose. Settings and keybinding discovery would drift from configurable behavior.

## Risks / Trade-offs

- Paragraph semantics differ from full Vim nroff/section behavior → Document blank-line-only scope and limitations.
- Off-by-one ranges around blank separators → Cover `ip`, `ap`, `d}`, `d{`, counts, first/last paragraph, and separator-only cursor cases in buffer tests before modal smoke tests.
- Config/keybinding drift → Add descriptor/config/customization/docs-drift coverage and live `VimEditor` construction tests.
- Operator ranges could mutate wrong register type → Keep paragraph operations in existing characterwise motion/text-object register paths and assert unnamed register text in modal tests.
- Visual block behavior could be ambiguous → Treat paragraph motions as active-cursor movement only; preserve existing visual-block selection mechanics.

## Migration Plan

- No data migration or dependency change.
- Implement behind existing default keymap and semantic config; existing settings remain valid.
- Rollback is deleting the new descriptors/helpers/tests/docs and removing paragraph action names from type unions.

## Open Questions

- None. Use blank-line-only paragraph semantics for this change.
