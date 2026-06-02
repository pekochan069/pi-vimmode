## Context

pi-vimmode already has a modal engine, semantic command parser, prompt-buffer operation module, Ex command parser, and focused tests. Existing text objects cover generic Vim shapes (word, quote, bracket), but agent prompts commonly contain richer structures: Markdown fences and sections, task/list items, XML-ish tags, and pasted error blocks.

This change should deepen prompt editing around those prompt-native structures without turning pi-vimmode into a full Markdown/XML/Vimscript parser. Behavior must remain finite, safe, testable, and local to prompt text.

## Goals / Non-Goals

**Goals:**

- Add deterministic prompt-native structure range resolution for code fences, Markdown sections, list items, XML-ish tags, and error blocks.
- Expose those structures as operator text objects for `d`, `c`, and `y` using existing `i`/`a` text-object flow.
- Add line/range transforms for common prompt reshaping: quote, unquote, bulletize, wrap in code fence, indent, dedent, and reflow.
- Preserve safe no-op behavior for malformed structures, unsupported commands, and missing targets.
- Cover range resolution, modal dispatch, Ex parsing, docs, and integration behavior with focused tests.

**Non-Goals:**

- Full Vim text-object grammar, `gq` operator parity, Vimscript, or arbitrary custom transform pipelines.
- Full Markdown AST parsing, full XML parsing, or language-aware code formatting.
- Prompt history or multi-prompt transformations.
- New runtime dependencies.

## Decisions

### 1. Put structure/range semantics in a pure prompt-structure module

Create a pure module such as `src/prompt-structures.ts` for scanning and resolving prompt-native ranges. Keep modal dispatch thin: parser identifies requested object/transform, engine calls pure buffer/structure operations, effects apply edit/register results.

Alternatives considered:

- Add all logic directly to `src/modal/engine.ts`: rejected because engine is already a large state machine and should not own Markdown/tag parsing.
- Add all logic directly to `src/buffer.ts`: acceptable for simple helpers, but a dedicated pure module keeps the prompt-buffer API deep without turning `buffer.ts` into a parser pile.

### 2. Reuse existing `inner` / `around` operator text-object flow

Extend `VimTextObjectTarget` and `TEXT_OBJECT_TARGET_KEYS` with prompt-native targets. Default target keys are only interpreted after operator + `i`/`a`, avoiding conflicts with normal-mode motions and commands.

Default targets:

- `if` / `af`: inner/around Markdown code fence
- `ih` / `ah`: inner/around Markdown heading section
- `il` / `al`: inner/around Markdown list item
- `it` / `at`: inner/around XML-ish tag
- `ie` / `ae`: inner/around pasted error block

Alternatives considered:

- Add new standalone normal commands: rejected for v1 because operator text objects already match existing architecture and user expectations.
- Make target bindings configurable now: deferred; existing text objects are not configurable either, and adding config surface before behavior stabilizes increases scope.

### 3. Add transforms through Ex range commands first

Implement transforms as Ex commands because the existing Ex parser already supports current-line, explicit ranges, and visual ranges (`'<,'>`). This makes transforms usable from normal mode and visual mode without designing a new transform operator grammar.

Default commands:

- `:quote`
- `:unquote`
- `:bulletize`
- `:fence [language]`
- `:indent`
- `:dedent`
- `:reflow [width]`

Alternatives considered:

- Use normal-mode `g` bindings for every transform: rejected for v1 because it adds keymap surface and repeat semantics before range behavior is proven.
- Use Ex substitution only: rejected because transforms need structural semantics and safe formatting, not literal replacement.

### 4. Keep transforms conservative and reversible where practical

Transforms operate on selected/current line ranges, preserve final newline semantics, and avoid altering code fence or error-block internals when reflowing prose. `dedent` removes at most one indent unit from each line and never removes non-whitespace content.

Alternatives considered:

- Aggressive Markdown normalization: rejected because prompts often contain intentionally rough pasted context where preserving bytes matters.

### 5. Tests mirror implementation seams

Add pure range/transform tests around new modules, parser tests around Ex command parsing, modal tests for operator/visual dispatch, and docs tests only if existing validation supports them. Continue using `bun test` and `bun run check-types`.

## Risks / Trade-offs

- Ambiguous structure detection → Prefer nearest containing structure, document precedence, and no-op when malformed.
- Parser false positives in pasted text → Keep heuristics line-oriented and conservative; do not parse full Markdown/XML.
- Text-object key collisions → Targets only resolve after operator + `i`/`a`; normal-mode keys keep current behavior.
- `src/modal/engine.ts` growth → Add helper functions or small modules instead of embedding large transform branches.
- Reflow corrupts code/errors → Treat fenced code and error blocks as non-reflowable segments.

## Migration Plan

1. Add pure structure range resolver and tests.
2. Extend text-object target types and command parser mapping.
3. Wire modal operator text-object dispatch through existing delete/yank/change paths.
4. Add Ex transform parsing and pure transform operations.
5. Wire transform execution for current-line, explicit, and visual ranges.
6. Update docs and run `bun test`, `bun run check-types`, `bun run lint`, and `bun run format:check`.

Rollback strategy: remove new target mappings and Ex transform commands; existing Vim modes, generic text objects, search, Ex line commands, and Pi delegation remain unchanged.

## Open Questions

- Should transform Ex command names gain short aliases after v1 usage proves common patterns?
- Should prompt-native text-object target keys become configurable alongside future broader keymap customization?
- Should `:fence` infer language from existing selected content later, or stay explicit only?
