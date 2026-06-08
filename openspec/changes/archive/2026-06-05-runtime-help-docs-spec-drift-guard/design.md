## Context

pi-vimmode already has finite semantic action metadata, protected shortcut diagnostics, Ex command-line parsing, transient info/error messages, feature/settings docs, and durable OpenSpec specs. Existing runtime diagnostics answer customization questions through `:vimdoctor`, `:keymap`, `:mapcheck`, and `:actions`, but they do not answer broader questions such as "what feature areas exist?", "what limits apply?", or "what was the last runtime message?".

Docs/spec/runtime drift is a known failure mode. A previous behavior-contract fix documented that `:nohlsearch` support existed while user docs still described it as unsupported. This change makes runtime help source-backed and adds development-time drift guards so future feature additions update docs/spec/test anchors before completion.

## Goals / Non-Goals

**Goals:**

- Provide compact runtime help through finite read-only Ex commands: `:help [topic]`, `:features [query]`, and `:messages`.
- Build help/features from typed source metadata that can be tested, searched, and linked to docs/spec/test anchors.
- Reuse existing `src/customization.ts` action and protected shortcut metadata instead of copying key/action lists into help handlers.
- Add docs drift validation that catches supported-command contradictions, missing feature help anchors, and settings-doc/source mismatches where practical.
- Preserve prompt-local editing state: prompt text, cursor, mode, visual selection, search highlights, registers, marks, macro state, dot-repeat, and Pi shortcut delegation.
- Keep output bounded to the current one-row transient message model.

**Non-Goals:**

- No full Vim help tag system, help-file parser, pager, split window, or multi-line docs browser.
- No runtime parsing of OpenSpec, tests, or Markdown docs inside the editor.
- No full command palette replacement for `:actions`.
- No new user settings unless implementation discovers a hard need; if any option is added, it must go through `src/types.ts`, `src/config.ts`, option cloning, docs, and live editor tests.
- No broad Vim/Neovim parity claims.

## Decisions

### 1. Add a pure runtime help/feature registry seam

Target seams: new `src/runtime-help.ts` or equivalent, `src/customization.ts`, `src/config.ts`, `src/ex.ts`, and tests.

Create a typed registry for runtime help entries. Each entry should include a stable id, category, aliases/topics, compact summary, examples, limits, related runtime commands/actions, docs anchor, spec anchor, and test anchor when applicable. The registry may import or accept existing customization/action metadata so keymap, protected shortcut, macro, mark, search, and transform information stays single-sourced.

Rationale: runtime help must be finite and searchable, but copying behavior lists into `src/modal/engine.ts` would create another drift surface. A pure registry can be unit-tested and reused by runtime commands and docs guard tests.

Alternatives considered:

- Scrape `docs/features.md` at runtime: rejected because editor commands should be fast, deterministic, and independent of packaged Markdown availability.
- Generate runtime help from OpenSpec specs at runtime: rejected because OpenSpec is a development contract, not a runtime dependency.
- Inline topic strings in Ex execution branches: rejected because it deepens `src/modal/engine.ts` and duplicates existing action/protected shortcut metadata.

### 2. Keep `:help`, `:features`, and `:messages` finite Ex diagnostics

Target seams: `src/ex.ts`, `src/modal/engine.ts`, `src/modal/types.ts`, `src/modal/view.ts`, and tests.

Extend the finite Ex parser with exact command names `help`, `features`, and `messages`. `:help` and `:features` accept an optional bounded query/topic string. `:messages` accepts no arguments in v1. Unsupported abbreviations and unexpected trailing syntax return existing Ex error messages rather than implying Vimscript grammar.

Execution follows the current read-only diagnostic pattern: compute a string, return `restoreVisualExState(state, { kind: "info", text })`, and avoid buffer edit helpers. These commands must not modify prompt text, cursor placement, visual state, search state, registers, marks, macros, or dot-repeat.

Rationale: existing diagnostic commands already prove the pattern. The new commands are broader discovery helpers, not text-editing commands.

Alternatives considered:

- Add a separate non-Ex UI command surface: rejected because users already discover runtime diagnostics through Ex command-line mode.
- Add aliases such as `:h` immediately: rejected for v1 because aliases can collide with broader Vim expectations and should be added only with explicit tests/docs.

### 3. Implement `:messages` as capped message introspection, not a pager

Target seams: `src/modal/types.ts`, `src/modal/engine.ts`, `src/modal/view.ts`, `src/vim-editor.ts`, and tests.

Store a bounded recent message log in modal/editor state, capped to a small constant such as 20 entries. Log user-facing transient messages from Ex success/error/info and optional no-op feedback. Do not log active Ex input. `:messages` reads the log and shows a width-safe one-row summary such as count plus latest message; the `:messages` output itself should not be appended to the log.

Rationale: users need to inspect recent runtime messages, but the renderer currently supports one bounded row. A capped summary keeps the feature useful without introducing pager/layout complexity.

Alternatives considered:

- No history, only current transient message: rejected as too weak because the next handled input clears messages before users can inspect them.
- Multi-line message panel: rejected as larger UI work and likely tied to the separate TODO about reserved Ex display rows.
- Persist messages across editor sessions: rejected because pi-vimmode state is prompt-local and in-memory.

### 4. Make docs drift guard structural and narrow

Target seams: new test/helper under `test/` or `scripts/`, `docs/features.md`, `docs/settings.md`, `openspec/specs/*`, and `package.json` only if a named script is warranted.

Add guard checks that run in the normal validation path, preferably `bun test`. The guard should compare structured data, not infer semantics from prose. Recommended checks:

- Every runtime help registry entry has a matching docs anchor in `docs/features.md` and a spec anchor or explicit approved exception.
- Every documented `:help`, `:features`, `:messages`, `:actions`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:noh`, and `:nohlsearch` claim matches finite source command support.
- Settings docs tables list supported `piVimMode` paths/defaults from exported config/type metadata where practical, plus an approved ignored/legacy list.
- Known stale-claim bans fail explicitly, including docs claiming `:noh` or `:nohlsearch` are unsupported.
- Test anchors referenced by registry entries exist so new features do not ship with docs-only help.

Rationale: brittle natural-language linting causes false positives. Stable anchors plus explicit contradiction checks catch real drift with low maintenance cost.

Alternatives considered:

- Full generated docs from registry: rejected for v1 because human docs remain better for examples and product tone.
- OpenSpec validation plugin: rejected unless needed later; Bun tests are already part of the validation stack and easier to keep local.

### 5. Preserve existing customization diagnostics contracts

Target seams: `src/customization.ts`, `src/ex.ts`, `src/modal/engine.ts`, and `openspec/specs/vim-customization-diagnostics/spec.md`.

`:`actions remains action-focused and finite. `:features` may reuse action entries but should explain broader feature areas, limits, docs anchors, and effective enablement when runtime options disable marks, macros, search highlighting, prompt structures, or prompt transforms. `:mapcheck`, `:keymap`, and `:vimdoctor` behavior should not change except for shared metadata reuse.

Rationale: users already have customization commands. This change adds a broader help layer without breaking existing troubleshooting workflows.

Alternatives considered:

- Replace `:actions` with `:features`: rejected because actions and product feature areas answer different questions.
- Merge all diagnostics into `:help`: rejected because `:mapcheck` and `:keymap` need precise key/action output.

## Risks / Trade-offs

- Registry drift from source constants → import/reuse `src/customization.ts` and config defaults where possible; add coverage tests for command/action/settings anchors.
- Docs guard too brittle → validate structured anchors and explicit banned contradictions first; avoid broad prose parsing.
- `:messages` increases modal state complexity → cap history, keep one-row summary, and add focused clearing/history tests.
- One-row help output can be terse → use searchable topics and docs anchors; defer pager/expanded display to a separate change.
- Feature enablement may be misleading when based on partial options → test disabled marks/macros/search/highlight/prompt transform cases and fall back to neutral wording when effective state is not known.
- New Ex commands could imply Vim parity → document exact command names, reject unsupported aliases, and test unsupported topics/grammar.

## Migration Plan

1. Add pure runtime help/feature registry and unit tests without changing runtime behavior.
2. Add docs drift guard tests against current docs/source and fix any existing mismatches.
3. Extend Ex parser with `help`, `features`, and `messages` parse results.
4. Add modal execution branches that emit info messages only and preserve visual Ex restoration behavior.
5. Add capped message log state if needed by `:messages`, including tests that `:messages` output itself is not logged.
6. Update `docs/features.md`, `docs/settings.md` if affected, and any ADR required by the source-of-truth policy.
7. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback: remove the new registry, Ex command parser branches, message history state, docs guard tests, and docs sections. Because runtime behavior is additive and no persistent data is introduced, rollback has no user data migration.

## Open Questions

- Exact capped message log size: 20 is a reasonable default, but implementation should choose the smallest useful constant and test it.
- Whether `:help <topic>` should search only registry topic aliases or also action descriptions from `:actions`.
- Whether a new ADR is needed for the runtime help registry as a durable source-of-truth policy, or whether docs/spec/test anchors in the registry are enough.
- How much settings-doc validation can be automated from existing `src/config.ts` exports without over-exposing implementation constants.
