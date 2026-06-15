## 1. Parser, Types, and Keymap Configuration

- [x] 1.1 Add `wordForwardBig`, `wordBackwardBig`, `wordEndBig`, `wordPreviousEnd`, and `wordPreviousEndBig` to `VimMotionAction`, `VIM_MOTION_ACTIONS`, and resolved keymap typing.
- [x] 1.2 Add default motion bindings `W`, `B`, `E`, `ge`, and `gE` in `DEFAULT_VIM_KEYMAP.motions` and include the new actions in default `operatorMotions` for delete/change/yank.
- [x] 1.3 Update keymap cloning, parsing, validation, and merge paths so custom bindings and operator-motion matrices preserve valid new motion actions and reject invalid siblings field-by-field.
- [x] 1.4 Add parser/keymap tests for default `W`/`B`/`E`/`ge`/`gE`, count prefixes, after-operator counts, `gg` vs `ge`/`gE` prefix resolution, invalid `gX`, and configured multi-key bindings.
- [x] 1.5 Add config/live-editor tests proving new motion bindings and `operatorMotions` survive resolved options and live `VimEditor` construction without dropping existing command/motion/operator/macro/mark/search/UI options.

## 2. Pure Prompt Buffer Navigation

- [x] 2.1 Add pure whitespace-token helpers for WORD forward, WORD backward, WORD end, previous word end, and previous WORD end while preserving existing lowercase `w`/`b`/`e` behavior.
- [x] 2.2 Add count-aware cursor-position helpers for all new motions with clamped prompt-local behavior at prompt start/end and across multiline text.
- [x] 2.3 Extend motion range resolution for delete/change/yank so `W`, `B`, `E`, `ge`, and `gE` produce correct characterwise ranges and safe no-op/no-register results when no non-empty target exists.
- [x] 2.4 Add focused buffer tests for paths, URLs, flags, punctuation-heavy tokens, whitespace, prompt boundaries, multiline text, counted targets, and previous-end off-by-one cases.

## 3. Modal Normal and Visual Integration

- [x] 3.1 Wire new semantic motions through `moveEffectFor` or an equivalent pure cursor-restore path in `src/modal/normal.ts` without adding raw text splicing to modal code.
- [x] 3.2 Wire new semantic motions through `applyOperatorMotion` for delete/change/yank, including repeatable change recording for changed delete/change ranges.
- [x] 3.3 Ensure visual character mode extends selections with the new motions using the same target semantics as normal mode.
- [x] 3.4 Add modal tests for normal movement, visual selection extension, `dW`, `cE`, `yB`, `dge`, `ygE`, counts, missing-target no-ops, register writes, mode transitions, and preserved search highlights/marks/macros where applicable.

## 4. Runtime Discovery and Documentation Surfaces

- [x] 4.1 Update any runtime help, feature registry, keybinding popup, or drift-guard metadata that enumerates supported motions or semantic motion action names.
- [x] 4.2 Update `docs/features.md` with WORD and previous-end motion behavior, operator examples, count examples, and explicit limitations around lowercase boundary changes and subword/display-line non-goals.
- [x] 4.3 Update `docs/settings.md` with the new `piVimMode.keymap.motions` action names, defaults, custom binding examples, and `operatorMotions` usage.
- [x] 4.4 Add or update docs/drift tests that protect the new feature and settings docs from stale motion/action-name claims.

## 5. Regression Coverage

- [x] 5.1 Run focused tests for existing lowercase `w`, `b`, and `e` behavior to prove this change did not retune current word boundaries.
- [x] 5.2 Run focused tests for existing operator motions (`h`, `j`, `k`, `l`, `w`, `b`, `e`, `0`, `^`, `$`, `gg`, `G`, `%`) to prove the expanded motion set did not regress current ranges.
- [x] 5.3 Run focused tests for Pi-owned shortcut delegation and insert-mode behavior to prove uppercase/multi-key motion additions do not capture insert-mode text or protected shortcuts.

## 6. Validation

- [x] 6.1 Run `bun test`.
- [x] 6.2 Run `bun run check-types`.
- [x] 6.3 Run `bun run lint`.
- [x] 6.4 Run `bun run format:check`.
- [x] 6.5 Run `openspec validate --specs --strict`.
- [x] 6.6 Run `openspec status --change add-word-previous-end-motions` and confirm the change remains apply-ready.
