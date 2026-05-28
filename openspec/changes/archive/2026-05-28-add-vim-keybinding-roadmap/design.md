## Context

pi-vimmode already separates Vim semantics across a few stable seams:

- `src/types.ts` defines semantic motion, command, operator, keymap, register, and edit-result types.
- `src/commands.ts` resolves normal-mode input, pending prefixes, operators, configured key sequences, macros, marks, and operator-motion combinations.
- `src/buffer.ts` owns pure prompt text transformations and cursor/range calculations.
- `src/modal/engine.ts` applies parsed command results to modal state and emits adapter effects for Pi-owned editor behavior.
- `src/config.ts` owns default and user-configured keymap resolution.

The change should extend these seams instead of adding a parallel Vim parser. Most new behavior is normal-mode command parsing plus pure buffer operations, with modal state additions for counts, character-search repeat, and dot-repeat.

## Goals / Non-Goals

**Goals:**

- Add the roadmap in implementation slices that each produce useful user-visible behavior.
- Keep command parsing deterministic and testable with finite pending input states.
- Keep text-editing behavior in pure buffer helpers where practical.
- Preserve Pi-owned shortcut delegation except for `Ctrl+A` and `Ctrl+X`, which pi-vimmode will explicitly own in normal/visual/operator contexts where supported.
- Preserve existing registers, macros, marks, visual modes, and configurable keymap behavior.

**Non-Goals:**

- Full Vim parity.
- Vimscript, recursive mappings, Ex commands, window/buffer concepts, or advanced search UI.
- Implementing `/`, `?`, `n`, or `N` search in this change.
- Replacing the existing keymap architecture.

## Decisions

### 1. Extend semantic actions rather than matching raw keys in the modal engine

Add new semantic action names to the existing motion/command model, then bind default keys through `src/config.ts` and resolve them through `src/commands.ts`.

Alternatives considered:

- **Raw-key checks in `modal/engine.ts`:** faster locally, but bypasses configurable keymap support and scatters command knowledge.
- **Separate parser for advanced Vim commands:** creates two sources of truth and makes prefixes/counts harder to reason about.

Rationale: the existing semantic keymap is already the public customization point, so new supported actions should flow through it where practical.

### 2. Introduce counts as parser state, not command-specific hacks

Numeric prefixes should accumulate in normal-mode pending state and be attached to resolved commands, motions, operator-line commands, and operator-motion commands that opt into count handling.

Alternatives considered:

- **Implement counts only in individual command handlers:** simpler for `3w`, but fails for `2dd`, `5<C-a>`, and future text objects.
- **Full Vim count grammar immediately:** more compatible, but too much surface for the first slice.

Rationale: a central count prefix makes behavior consistent while still allowing individual commands to declare whether and how counts apply.

### 3. Keep buffer transformations pure and modal-only state explicit

Numeric increment/decrement, character replacement, substitution, word-end movement, line-local find, and text-object range discovery should be pure helpers in `src/buffer.ts` where possible. Dot-repeat and last character-search metadata should live in modal state because they depend on prior user actions rather than prompt text alone.

Alternatives considered:

- **Perform all edits directly in the modal engine:** easier to thread modal state, but harder to unit test and reuse from visual/operator behavior.
- **Persist repeat/search state inside buffer helpers:** makes pure helpers stateful and harder to validate.

Rationale: pure text helpers keep edge cases covered by focused tests, while modal state remains the right home for cross-keystroke memory.

### 4. Treat dot-repeat as repeat of completed changes, not arbitrary input replay

`.` should repeat the last completed change command after it has resolved to a concrete edit. It should not initially attempt to repeat every possible input sequence, macro playback, or Pi-delegated action.

Alternatives considered:

- **Input-token replay:** closer to Vim and could reuse macro machinery, but risks surprising interactions with registers, pending prefixes, insert-mode text, and macro recursion.
- **Edit-delta replay:** safer for pure edits, but may not preserve command semantics like counts and target discovery.

Rationale: command-level repeat is the safest first model. It can cover `x`, `r`, `s`, `S`, `D`, `C`, `dd`, `cc`, `p`, numeric adjustment, and later text-object changes without conflating dot-repeat with macros.

### 5. Stage text objects after count and repeat foundations

Implement `iw`/`aw` first, then quote and bracket objects. Text objects should be resolved as operator targets, not standalone motions that move the cursor by default.

Alternatives considered:

- **Start with text objects before counts:** high prompt-editing value, but creates more parser complexity before the count foundation exists.
- **Implement every Vim text object family together:** increases edge cases and slows delivery.

Rationale: counts and repeat improve existing commands immediately. Text objects then build on the same operator-target infrastructure.

## Risks / Trade-offs

- Count grammar may conflict with literal `0` line-start behavior → Only treat non-zero digits as count prefixes at count start; keep `0` as line-start when no count is pending.
- `Ctrl+A` / `Ctrl+X` may collide with terminal/Pi shortcuts → Own them only in Vim command contexts and keep insert mode/Pi-owned contexts delegated.
- Numeric parsing has many Vim edge cases → Define and test a first supported subset, then document deferred cases.
- Dot-repeat can become too broad too quickly → Start with explicit supported change commands and no-op safely for unsupported last actions.
- Text-object range edge cases can be subtle around nesting and unmatched delimiters → Start with predictable nearest-pair behavior and safe no-op when no target exists.
- Configurable keymap growth can expand scope → Add semantic actions to configuration only when they map cleanly to existing finite sequence matching.

## Migration Plan

1. Add tests for each slice before or alongside implementation.
2. Implement Phase 1 commands and update README supported-keymap tables.
3. Implement Phase 2 find/repeat behavior and document repeat limitations.
4. Implement Phase 3 text objects and document supported objects/edge cases.
5. Run `bun test`, `bun run check-types`, `bun run lint`, and `bun run format:check` before applying/archiving.

Rollback strategy: each phase should be independently revertible. Because the change adds editor behavior without persistent storage or migrations, rollback is restoring prior code and docs.

## Open Questions

- Which numeric formats should Phase 1 support for `Ctrl+A` / `Ctrl+X`: signed integers only, leading-zero preservation, decimals, or broader Vim-compatible formats?
- Which commands should be included in the first dot-repeat allowlist?
- Should custom keymap configuration expose every new command immediately, or should text-object configuration wait until the text-object model stabilizes?
- Should counts apply to paste in the first slice, or should paste counts be deferred until repeat/register behavior is verified?
